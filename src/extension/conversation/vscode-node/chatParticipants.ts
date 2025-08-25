/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as l10n from '@vscode/l10n';
import * as vscode from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { IChatAgentService, defaultAgentName, editingSessionAgent2Name, editingSessionAgentEditorName, editingSessionAgentName, editorAgentName, editsAgentName, getChatParticipantIdFromName, notebookEditorAgentName, terminalAgentName, vscodeAgentName, workspaceAgentName } from '../../../platform/chat/common/chatAgents';
import { IChatQuotaService } from '../../../platform/chat/common/chatQuotaService';
import { IInteractionService } from '../../../platform/chat/common/interactionService';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { IEndpointProvider } from '../../../platform/endpoint/common/endpointProvider';
import { IOctoKitService } from '../../../platform/github/common/githubService';
import { IExperimentationService } from '../../../platform/telemetry/common/nullExperimentationService';
import { Event, Relay } from '../../../util/vs/base/common/event';
import { DisposableStore, IDisposable } from '../../../util/vs/base/common/lifecycle';
import { autorun } from '../../../util/vs/base/common/observableInternal';
import { URI } from '../../../util/vs/base/common/uri';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { ChatRequest } from '../../../vscodeTypes';
import { Intent, agentsToCommands } from '../../common/constants';
import { ChatParticipantRequestHandler } from '../../prompt/node/chatParticipantRequestHandler';
import { IFeedbackReporter } from '../../prompt/node/feedbackReporter';
import { ChatSummarizerProvider } from '../../prompt/node/summarizer';
import { ChatTitleProvider } from '../../prompt/node/title';
import { IUserFeedbackService } from './userActions';
import { getAdditionalWelcomeMessage } from './welcomeMessageProvider';

export class ChatAgentService implements IChatAgentService {
	declare readonly _serviceBrand: undefined;

	private _lastChatAgents: ChatAgents | undefined; // will be cleared when disposed

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) { }

	public debugGetCurrentChatAgents(): ChatAgents | undefined {
		return this._lastChatAgents;
	}

	register(): IDisposable {
		const chatAgents = this.instantiationService.createInstance(ChatAgents);
		chatAgents.register();
		this._lastChatAgents = chatAgents;
		return {
			dispose: () => {
				chatAgents.dispose();
				this._lastChatAgents = undefined;
			}
		};
	}
}
// Provide alias for intent resolution
type IntentOrGetter = Intent | ((request: vscode.ChatRequest) => Intent);

class ChatAgents implements IDisposable {
	private readonly _disposables = new DisposableStore();
	private additionalWelcomeMessage: vscode.MarkdownString | undefined;
	private readonly _createdAgents: vscode.ChatParticipant[] = [];

	constructor(
		@IOctoKitService private readonly octoKitService: IOctoKitService,
		@IAuthenticationService private readonly authenticationService: IAuthenticationService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IUserFeedbackService private readonly userFeedbackService: IUserFeedbackService,
		@IEndpointProvider private readonly endpointProvider: IEndpointProvider,
		@IFeedbackReporter private readonly feedbackReporter: IFeedbackReporter,
		@IInteractionService private readonly interactionService: IInteractionService,
		@IChatQuotaService private readonly _chatQuotaService: IChatQuotaService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExperimentationService private readonly experimentationService: IExperimentationService,
	) { }

	dispose(): void {
		for (const agent of this._createdAgents) {
			try { (agent as any).dispose?.(); } catch { /* ignore */ }
		}
		this._disposables.dispose();
	}

	register(): void {
		this.additionalWelcomeMessage = this.instantiationService.invokeFunction(getAdditionalWelcomeMessage);
		this.registerDefaultAgent();
		this.registerEditingAgent();
		this.registerEditingAgent2();
		this.registerEditingAgentEditor();
		this.registerEditsAgent();
		this.registerEditorDefaultAgent();
		this.registerNotebookEditorDefaultAgent();
		this.registerNotebookDefaultAgent();
		this.registerWorkspaceAgent();
		this.registerVSCodeAgent();
		this.registerTerminalAgent();
		this.registerTerminalPanelAgent();
		this.personalizeWelcomeMessage();
	}

	private async personalizeWelcomeMessage() {
		try {
			const user = await this.octoKitService.getCurrentAuthedUser();
			if (!user) { return; }
			const firstName = (user.name ?? user.login).split(/\s+/)[0];
			const encodePrompt = (prompt: string) => encodeURIComponent(JSON.stringify([prompt]));
			const prompts: { title: string; prompt: string; detail: string }[] = [
				{ title: 'Summarize this repository', prompt: 'Give me a concise summary of this repository structure, key technologies, and primary responsibilities of each top-level folder.', detail: 'High-level overview.' },
				{ title: 'Explain the open file', prompt: 'Explain the currently active editor file focusing on exported functions, public APIs, and potential improvement opportunities.', detail: 'Understand a file.' },
				{ title: 'Add tests for a function', prompt: 'Write unit tests for the main exported function in the active file. Use the existing test framework already configured in this repo.', detail: 'Increase coverage.' }
			];
			let mdValue = `### Hi, ${firstName}!\n`;
			mdValue += `Signed in as **${user.login}**. Here are some quick starters:`;
			mdValue += `\n\n` + prompts.map(p => `> **${p.title}**  \\\n+> ${p.detail}  \\\n+> [Try it](command:workbench.action.chat.open?${encodePrompt(p.prompt)})`).join('\n\n');
			const personalized = new vscode.MarkdownString(mdValue);
			personalized.isTrusted = { enabledCommands: ['workbench.action.chat.open'] };
			for (const agent of this._createdAgents) {
				(agent as any).additionalWelcomeMessage = personalized;
			}
		} catch { /* ignore */ }
	}

	private createAgent(name: string, defaultIntentIdOrGetter: IntentOrGetter, options?: { id?: string }): vscode.ChatParticipant {
		const id = options?.id || getChatParticipantIdFromName(name);
		const onRequestPaused = new Relay<vscode.ChatParticipantPauseStateEvent>();
		const agent = vscode.chat.createChatParticipant(id, this.getChatParticipantHandler(id, name, defaultIntentIdOrGetter, onRequestPaused.event));
		this._createdAgents.push(agent);
		(agent as any).onDidReceiveFeedback?.((e: any) => this.userFeedbackService.handleFeedback(e, id));
		(agent as any).onDidPerformAction?.((e: any) => this.userFeedbackService.handleUserAction(e, id));
		if ((agent as any).onDidChangePauseState) { onRequestPaused.input = (agent as any).onDidChangePauseState; }
		this._disposables.add(autorun(reader => { (agent as any).supportIssueReporting = this.feedbackReporter.canReport.read(reader); }));
		return agent;
	}

	private async initDefaultAgentRequestorProps(defaultAgent: vscode.ChatParticipant) {
		const trySet = async () => {
			const user = await this.octoKitService.getCurrentAuthedUser();
			if (!user) { return false; }
			(defaultAgent as any).requester = { name: user.login, icon: URI.parse(user?.avatar_url ?? `https://avatars.githubusercontent.com/${user.login}`) };
			return true;
		};
		if (!(await trySet())) {
			const listener = this.authenticationService.onDidAuthenticationChange(async () => { if (await trySet()) { listener.dispose(); } });
		}
	}

	private registerWorkspaceAgent() { (this.createAgent(workspaceAgentName, Intent.Workspace) as any).iconPath = new vscode.ThemeIcon('code'); }
	private registerVSCodeAgent() { const a = this.createAgent(vscodeAgentName, Intent.VSCode) as any; a.iconPath = vscode.env.appName.includes('Insiders') || vscode.env.appName.includes('OSS') ? new vscode.ThemeIcon('vscode-insiders') : new vscode.ThemeIcon('vscode'); }
	private registerTerminalAgent() { (this.createAgent(terminalAgentName, Intent.Terminal) as any).iconPath = new vscode.ThemeIcon('terminal'); }
	private registerTerminalPanelAgent() { (this.createAgent(terminalAgentName, Intent.Terminal, { id: 'swe.agent.terminalPanel' }) as any).iconPath = new vscode.ThemeIcon('terminal'); }
	private registerEditingAgent() { const a = this.createAgent(editingSessionAgentName, Intent.Edit) as any; a.iconPath = new vscode.ThemeIcon('copilot'); a.additionalWelcomeMessage = this.additionalWelcomeMessage; a.titleProvider = this.instantiationService.createInstance(ChatTitleProvider); }
	private registerEditingAgentEditor() { const a = this.createAgent(editingSessionAgentEditorName, Intent.Edit) as any; a.iconPath = new vscode.ThemeIcon('copilot'); a.additionalWelcomeMessage = this.additionalWelcomeMessage; }
	private registerEditingAgent2() { const a = this.createAgent(editingSessionAgent2Name, Intent.Edit2) as any; a.iconPath = new vscode.ThemeIcon('copilot'); a.additionalWelcomeMessage = this.additionalWelcomeMessage; a.titleProvider = this.instantiationService.createInstance(ChatTitleProvider); }
	private registerEditsAgent() { const a = this.createAgent(editsAgentName, Intent.Agent) as any; a.iconPath = new vscode.ThemeIcon('tools'); a.additionalWelcomeMessage = this.additionalWelcomeMessage; a.titleProvider = this.instantiationService.createInstance(ChatTitleProvider); }
	private registerNotebookEditorDefaultAgent() { (this.createAgent('notebook', Intent.Editor) as any).iconPath = new vscode.ThemeIcon('copilot'); }
	private registerNotebookDefaultAgent() { (this.createAgent(notebookEditorAgentName, Intent.notebookEditor) as any).iconPath = new vscode.ThemeIcon('copilot'); }
	private registerEditorDefaultAgent() { (this.createAgent(editorAgentName, Intent.Editor) as any).iconPath = new vscode.ThemeIcon('copilot'); }

	private registerDefaultAgent() {
		const intentGetter = (request: vscode.ChatRequest) => {
			const reqAny = request as any;
			if (this.configurationService.getExperimentBasedConfig(ConfigKey.Internal.AskAgent, this.experimentationService) && reqAny.model?.capabilities?.supportsToolCalling && this.configurationService.getNonExtensionConfig('chat.agent.enabled')) { return Intent.AskAgent; }
			return Intent.Unknown;
		};
		const a = this.createAgent(defaultAgentName, intentGetter) as any;
		a.iconPath = new vscode.ThemeIcon('copilot');
		this.initDefaultAgentRequestorProps(a);
		const helpPostfix = l10n.t({
			message: `To have a great conversation, ask me questions as if I was a real programmer:

* **Show me the code** you want to talk about by having the files open and selecting the most important lines.
* **Make refinements** by asking me follow-up questions, adding clarifications, providing errors, etc.
* **Review my suggested code** and tell me about issues or improvements, so I can iterate on it.

You can also ask me questions about your editor selection by [starting an inline chat session](command:inlineChat.start).

Learn more about [GitHub Copilot](https://docs.github.com/copilot/using-github-copilot/getting-started-with-github-copilot?tool=vscode&utm_source=editor&utm_medium=chat-panel&utm_campaign=2024q3-em-MSFT-getstarted) in [Visual Studio Code](https://code.visualstudio.com/docs/copilot/overview). Or explore the [Copilot walkthrough](command:swe.agent.open.walkthrough).`,
			comment: "{Locked='](command:inlineChat.start)'}"
		});
		const md = new vscode.MarkdownString(helpPostfix); md.isTrusted = { enabledCommands: ['inlineChat.start', 'swe.agent.open.walkthrough'] }; a.helpTextPostfix = md;
		a.additionalWelcomeMessage = this.additionalWelcomeMessage; a.titleProvider = this.instantiationService.createInstance(ChatTitleProvider); a.summarizer = this.instantiationService.createInstance(ChatSummarizerProvider);
	}

	private getChatParticipantHandler(id: string, name: string, defaultIntentIdOrGetter: IntentOrGetter, onRequestPaused: Event<vscode.ChatParticipantPauseStateEvent>): vscode.ChatExtendedRequestHandler {
		return async (request, context, stream, token): Promise<vscode.ChatResult> => {
			const privacy = await this.requestPolicyConfirmation(request, stream);
			if (privacy === true) { return {}; }
			const chatRequest = privacy as vscode.ChatRequest;
			const maybeSwitched = await this.switchToBaseModel(chatRequest, stream);
			this.interactionService.startInteraction();
			const defaultIntentId = typeof defaultIntentIdOrGetter === 'function' ? defaultIntentIdOrGetter(maybeSwitched) : defaultIntentIdOrGetter;
			const commandsForAgent = (agentsToCommands as any)[defaultIntentId];
			const reqAny = maybeSwitched as any;
			const intentId = reqAny.command && commandsForAgent ? commandsForAgent[reqAny.command] : defaultIntentId;
			const onPause = Event.chain(onRequestPaused, $ => $.filter(e => e.request === maybeSwitched).map(e => e.isPaused));
			const handler = this.instantiationService.createInstance(ChatParticipantRequestHandler, context.history, maybeSwitched, stream, token, { agentName: name, agentId: id, intentId }, onPause);
			return handler.getResult();
		};
	}

	private async requestPolicyConfirmation(request: vscode.ChatRequest, stream: vscode.ChatResponseStream): Promise<boolean | ChatRequest> {
		const endpoint = await this.endpointProvider.getChatEndpoint(request);
		if (endpoint.policy === 'enabled') { return request; }
		const reqAny = request as any;
		if (reqAny.acceptedConfirmationData?.[0]?.prompt && (await endpoint.acceptChatPolicy())) { return { ...request, prompt: reqAny.acceptedConfirmationData[0].prompt } as any; }
		stream.confirmation(`Enable ${endpoint.name} for all clients`, endpoint.policy.terms, { prompt: reqAny.prompt }, ['Enable']);
		return true;
	}

	private async switchToBaseModel(request: vscode.ChatRequest, stream: vscode.ChatResponseStream): Promise<ChatRequest> {
		const endpoint = await this.endpointProvider.getChatEndpoint(request);
		const baseEndpoint = await this.endpointProvider.getChatEndpoint('copilot-base');
		const reqAny = request as any;
		if (endpoint.multiplier === 0 || reqAny.model?.vendor !== 'copilot' || endpoint.multiplier === undefined) { return request; }
		if (this._chatQuotaService.overagesEnabled || !this._chatQuotaService.quotaExhausted) { return request; }
		const baseLmModel = (await (vscode as any).lm.selectChatModels({ id: baseEndpoint.model, family: baseEndpoint.family, vendor: 'copilot' }))[0];
		if (!baseLmModel) { return request; }
		await vscode.commands.executeCommand('workbench.action.chat.changeModel', { vendor: baseLmModel.vendor, id: baseLmModel.id, family: baseLmModel.family });
		request = { ...request, model: baseLmModel } as any;
		let msg: vscode.MarkdownString;
		if (this.authenticationService.copilotToken?.isIndividual) {
			msg = new vscode.MarkdownString(l10n.t({ message: 'You have exceeded your premium request allowance. We have automatically switched you to {0} which is included with your plan. [Enable additional paid premium requests]({1}) to continue using premium models.', args: [baseEndpoint.name, 'command:chat.enablePremiumOverages'], comment: ["{Locked=']({'}"] }));
			msg.isTrusted = { enabledCommands: ['chat.enablePremiumOverages'] };
		} else {
			msg = new vscode.MarkdownString(l10n.t('You have exceeded your premium request allowance. We have automatically switched you to {0} which is included with your plan. To enable additional paid premium requests, contact your organization admin.', baseEndpoint.name));
		}
		stream.warning(msg);
		return request;
	}
}