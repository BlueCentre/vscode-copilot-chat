/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { cloneAndChange } from '../../../util/vs/base/common/objects';

export enum ToolName {
	ApplyPatch = 'apply_patch',
	Codebase = 'semantic_search',
	VSCodeAPI = 'get_vscode_api',
	TestFailure = 'test_failure',
	RunTests = 'run_tests',
	FindFiles = 'file_search',
	FindTextInFiles = 'grep_search',
	ReadFile = 'read_file',
	ListDirectory = 'list_dir',
	GetErrors = 'get_errors',
	GetScmChanges = 'get_changed_files',
	UpdateUserPreferences = 'update_user_preferences',
	ReadProjectStructure = 'read_project_structure',
	CreateNewWorkspace = 'create_new_workspace',
	CreateNewJupyterNotebook = 'create_new_jupyter_notebook',
	SearchWorkspaceSymbols = 'search_workspace_symbols',
	Usages = 'list_code_usages',
	EditFile = 'insert_edit_into_file',
	CreateFile = 'create_file',
	ReplaceString = 'replace_string_in_file',
	MultiReplaceString = 'multi_replace_string_in_file',
	EditNotebook = 'edit_notebook_file',
	RunNotebookCell = 'run_notebook_cell',
	GetNotebookSummary = 'agent_getNotebookSummary',
	ReadCellOutput = 'read_notebook_cell_output',
	InstallExtension = 'install_extension',
	Think = 'think',
	FetchWebPage = 'fetch_webpage',
	FindTestFiles = 'test_search',
	GetProjectSetupInfo = 'get_project_setup_info',
	SearchViewResults = 'get_search_view_results',
	DocInfo = 'get_doc_info',
	GithubRepo = 'github_repo',
	SimpleBrowser = 'open_simple_browser',
	CreateDirectory = 'create_directory',
	RunVscodeCmd = 'run_vscode_command',
	CoreManageTodoList = 'manage_todo_list',
	CoreRunInTerminal = 'run_in_terminal',
	CoreGetTerminalOutput = 'get_terminal_output',
	CoreTerminalSelection = 'terminal_selection',
	CoreTerminalLastCommand = 'terminal_last_command',
	CoreCreateAndRunTask = 'create_and_run_task',
	CoreRunTask = 'run_task',
	CoreGetTaskOutput = 'get_task_output',
	CoreRunTest = 'runTests',
	ToolReplay = 'tool_replay'
}

export enum ContributedToolName {
	ApplyPatch = 'agent_applyPatch',
	Codebase = 'agent_searchCodebase',
	SearchWorkspaceSymbols = 'agent_searchWorkspaceSymbols',
	Usages = 'agent_listCodeUsages',
	UpdateUserPreferences = 'agent_updateUserPreferences',
	VSCodeAPI = 'agent_getVSCodeAPI',
	TestFailure = 'agent_testFailure',
	/** @deprecated moving to core soon */
	RunTests = 'agent_runTests1',
	FindFiles = 'agent_findFiles',
	FindTextInFiles = 'agent_findTextInFiles',
	ReadFile = 'agent_readFile',
	ListDirectory = 'agent_listDirectory',
	GetErrors = 'agent_getErrors',
	DocInfo = 'agent_getDocInfo',
	GetScmChanges = 'agent_getChangedFiles',
	ReadProjectStructure = 'agent_readProjectStructure',
	CreateNewWorkspace = 'agent_createNewWorkspace',
	CreateNewJupyterNotebook = 'agent_createNewJupyterNotebook',
	EditFile = 'agent_insertEdit',
	CreateFile = 'agent_createFile',
	ReplaceString = 'agent_replaceString',
	MultiReplaceString = 'agent_multiReplaceString',
	EditNotebook = 'agent_editNotebook',
	RunNotebookCell = 'agent_runNotebookCell',
	GetNotebookSummary = 'agent_getNotebookSummary',
	ReadCellOutput = 'agent_readNotebookCellOutput',
	InstallExtension = 'agent_installExtension',
	Think = 'agent_think',
	FetchWebPage = 'agent_fetchWebPage',
	FindTestFiles = 'agent_findTestFiles',
	GetProjectSetupInfo = 'agent_getProjectSetupInfo',
	SearchViewResults = 'agent_getSearchResults',
	GithubRepo = 'agent_githubRepo',
	CreateAndRunTask = 'agent_createAndRunTask',
	SimpleBrowser = 'agent_openSimpleBrowser',
	CreateDirectory = 'agent_createDirectory',
	RunVscodeCmd = 'agent_runVscodeCommand',
	ToolReplay = 'agent_toolReplay',
}

const toolNameToContributedToolNames = new Map<ToolName, ContributedToolName>();
const contributedToolNameToToolNames = new Map<ContributedToolName, ToolName>();
for (const [contributedNameKey, contributedName] of Object.entries(ContributedToolName)) {
	const toolName = ToolName[contributedNameKey as keyof typeof ToolName];
	if (toolName) {
		toolNameToContributedToolNames.set(toolName, contributedName);
		contributedToolNameToToolNames.set(contributedName, toolName);
	}
}

export function getContributedToolName(name: string | ToolName): string | ContributedToolName {
	return toolNameToContributedToolNames.get(name as ToolName) ?? name;
}

export function getToolName(name: string | ContributedToolName): string | ToolName {
	return contributedToolNameToToolNames.get(name as ContributedToolName) ?? name;
}

export function mapContributedToolNamesInString(str: string): string {
	contributedToolNameToToolNames.forEach((value, key) => {
		const re = new RegExp(`\\b${key}\\b`, 'g');
		str = str.replace(re, value);
	});
	return str;
}

export function mapContributedToolNamesInSchema(inputSchema: object): object {
	return cloneAndChange(inputSchema, value => typeof value === 'string' ? mapContributedToolNamesInString(value) : undefined);
}
