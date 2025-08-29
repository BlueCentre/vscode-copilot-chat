# Branding Architecture

This fork introduces a lightweight, low‑conflict branding layer on top of the upstream Copilot Chat extension.

## Goals

- Minimize merge conflicts when rebasing on upstream.
- Centralize "brand surface" (names, icons, description) behind thin indirection.
- Allow fast reversion to upstream identity (set one flag / remove overlay) for debugging.
- Keep tests stable by updating only snapshot literal identity strings that are rendered to users.

## Components

| Area | File / Mechanism | Purpose |
|------|------------------|---------|
| Brand config | `src/brand/common/brandConfig.ts` | Single source of display & agent names + feature flags. |
| Prompt identity helper | `src/brand/common/promptIdentity.tsx` | `agentNameForPrompts()` used everywhere prompts mention the agent. |
| Tool id mapping | `src/brand/common/toolNameMap.ts` + integration in `extension/tools/common/toolNames.ts` | Maps contributed tool IDs (e.g. `copilot_` -> `agent_`) without changing manifest IDs. |
| Manifest overlay | `script/brand/applyManifestOverlay.cjs` | Non‑destructive merge adding `displayName`, `icon`, description substitution. Runs via `prebuild` / `precompile`. |
| Welcome branding | `extension/conversation/vscode-node/welcomeMessageProvider.ts` | Adds personalized welcome guidance gated by flag. |
| Identity prompts | Updated rules in `extension/prompts/node/base/copilotIdentity.tsx` | Uses helper instead of hard-coded name. |
| Tests / snapshots | `agentPrompt.spec.tsx.snap` updated | Replaced literal identity strings with branded equivalents. |

## Workflow

1. Upstream sync / rebase.
2. Run `npm install` (postinstall unaffected by branding).
3. Build (`npm run build` or `npm run compile`) automatically triggers `brand:manifest` via `prebuild` / `precompile` scripts.
4. If upstream changes add new identity strings, run an audit:

```bash
grep -R "GitHub Copilot" src | grep -v vendor
```

Replace via prompt indirection if user-visible; leave legal/compliance references (e.g. telemetry doc links) unchanged.

1. Update or regenerate snapshots only when actual rendered output changes:

```bash
npm run test:unit -- -u
```

## Adding New Prompts

When introducing new prompt components or system messages:

- Import `agentNameForPrompts()` and use it instead of a literal name.
- Avoid embedding brand terms in variable / file names; keep those neutral.

## Tool IDs

Manifest keeps original `copilot_*` tool names for maximum compatibility. Runtime mapping presents branded or simplified names to the language model by transforming contributed IDs where needed.

## Manifest Strategy

We avoid directly editing top-level manifest identity fields (other than overlay) to keep diffs small. The overlay script:

- Skips if branding already applied (idempotent).
- Only overwrites `displayName`, `description`, `icon`.

Manual invocation: `npm run brand:manifest`.

## Residual Upstream References

Some occurrences of "GitHub Copilot" intentionally remain:

- Legal / survey copy where upstream telemetry or links depend on the official product name.
- Quota / review messages referencing upstream service limits.
- Contextual help links directing users to original Copilot documentation.

If full white‑labeling is required later, introduce additional flags (e.g. `preserveUpstreamBrandingInLegal`) and gate those strings similarly.

## Maintenance Checklist After Upstream Update (Fully Automated)

Routine upstream integration is now automated; invoke:

```bash
MAINT_AUTO_REBASE=1 MAINT_ALLOW_ENGINE_MISMATCH=1 MAINT_TOLERATE_TEST_FLAKE=1 npm run brand:maintain
```

The script will (optionally) rebase or merge, audit branding, run tests (with flake handling), run a strict namespace compile, and optionally commit/push.

### New Automation Env Vars

| Variable | Effect |
|----------|--------|
| `MAINT_AUTO_REBASE=1` | Perform upstream sync (rebase by default) before other steps. |
| `MAINT_REBASE_STRATEGY=merge` | Use merge instead of rebase (default `rebase`). |
| `MAINT_UPSTREAM_BRANCH=upstream/main` | Override the upstream reference. |
| `MAINT_ALLOW_DIRTY=1` | Proceed even if working tree has modifications (no stash). |
| `MAINT_STASH_DIRTY=1` | Auto-stash & pop local changes around the sync. |
| `MAINT_TOLERATE_REBASE_CONFLICT=1` | Do not hard fail on conflicts (reports in summary, aborts rebase/merge). |
| `MAINT_AUTO_COMMIT=1` | Auto-stage & commit resulting changes (if any). |
| `MAINT_COMMIT_MESSAGE="..."` | Custom commit message (default chore message). |
| `MAINT_AUTO_PUSH=1` | Push auto-commit to remote (defaults to `origin` current branch). |
| `MAINT_PUSH_REMOTE=origin` | Remote to push to. |
| `MAINT_PUSH_BRANCH=<name>` | Target branch (defaults to current). |

Existing flags (`MAINT_CLEAN_INSTALL`, `MAINT_ALLOW_ENGINE_MISMATCH`, `MAINT_SKIP_TESTS`, `MAINT_TOLERATE_TEST_FLAKE`) continue to apply.

### Minimal Hands-Off Flow

```bash
MAINT_AUTO_REBASE=1 MAINT_CLEAN_INSTALL=1 MAINT_ALLOW_ENGINE_MISMATCH=1 MAINT_TOLERATE_TEST_FLAKE=1 MAINT_AUTO_COMMIT=1 MAINT_AUTO_PUSH=1 npm run brand:maintain
```

This will: fetch, rebase (or merge), handle branding & tests, namespace smoke test, then commit & push any required diffs.

## Future Enhancements

- Introduce runtime toggle to switch between upstream and branded identity (dev aid).
- Automated lint rule forbidding raw "GitHub Copilot" in prompts (except allow‑listed paths).
- Script to produce a diff report of brand-impacting upstream changes.

---
This document is intentionally concise to reduce maintenance overhead while capturing the key indirection points that keep the branding layer low‑conflict.

## Allow‑Listed Upstream Brand References

The following remaining literal occurrences of "GitHub Copilot" are intentionally retained. They either reference upstream services, legal wording, telemetry semantics, or official documentation that should not be rebranded for accuracy / supportability.

| Area | File (path) | Example String (abridged) | Rationale |
|------|-------------|---------------------------|-----------|
| Help / learning links | `src/extension/conversation/vscode-node/chatParticipants.ts` | "Learn more about [GitHub Copilot]" | Directs users to upstream docs (URL authority). |
| Quota limits | `src/extension/review/node/githubReviewAgent.ts` | "GitHub Copilot Code Review quota" | Accurately names upstream service controlling quotas. |
| Firewall troubleshooting | `src/extension/log/vscode-node/loggingActions.ts` | "Troubleshooting firewall settings for GitHub Copilot" | Official doc title must stay exact for recognition. |
| Survey prompt | `src/platform/survey/vscode/surveyServiceImpl.ts` | "Help us make GitHub Copilot better" | Upstream feedback channel context. |
| Image service comment | `src/platform/image/common/imageService.ts` | "upload ... to GitHub Copilot chat attachments" | Internal service endpoint description. |
| Package localization & badges | `package.nls.json` keys/messages | Various sign-in / policy / icon strings | Reflect upstream marketplace & policy naming. |
| Marketplace categories & contributions | `package.json` contribution categories | "GitHub Copilot" | Aligns with extension categorization & discoverability. |
| Ignore file semantics | `.copilotignore` references (indirect) | (Not altered) | Standard filename references official feature. |

If a full white‑label build is ever required, introduce an additional feature flag set (e.g. `features.whiteLabelLegal = true`) and wrap each of the above in conditional substitutions, while retaining a build mode that preserves upstream wording for compliance.

To audit current allow‑list vs. codebase, run:

```bash
grep -R "GitHub Copilot" src package.json package.nls.json | sort
```

Compare results with this table; any new path not documented here should be triaged using the maintenance checklist above.

## Namespacing & Side‑by‑Side Strategy

The fork includes an opt‑in ID namespacing layer (`src/brand/common/idNamespace.ts`). It allows the
fork to operate today as a drop‑in replacement (keeping upstream IDs) while enabling a future flip
to side‑by‑side installation without ID collisions.

### How It Works

| Function | Purpose |
|----------|---------|
| `initializeNamespace(extensionId)` | Capture actual running extension id early in activation. |
| `maybeNamespacedId(local)` | Returns `local` unchanged while still using upstream ID; otherwise prefixes with `<extensionId>.`. |
| `makeExtensionScopedId(local)` | Always prefixes (for callers that want explicit scoping). |
| `maybeNamespacedLabel(label)` | Optionally prefixes labels when env var `COPILOT_FORK_NAMESPACE_LABELS=1` is set. |

Environment flags:

| Variable | Effect |
|----------|--------|
| `COPILOT_FORK_NAMESPACE_STRICT=1` | Force namespacing even if upstream ID unchanged (smoke test). |
| `COPILOT_FORK_NAMESPACE_LABELS=1` | Add `[<extensionId>]` prefix to user‑visible labels when namespacing active. |

### Adopting Namespacing Incrementally

When touching a file that registers a new command / participant / tool / controller:

```ts
import { maybeNamespacedId } from '../../brand/common/idNamespace';

const COMMAND_ID = maybeNamespacedId('myFeature.doThing');
vscode.commands.registerCommand(COMMAND_ID, run);
```

No mass refactor required; existing unchanged IDs remain stable until a forked extension identifier
is introduced.

### Side‑by‑Side Flip Checklist

1. Change `publisher` or `name` in `package.json` (new extension identifier).
2. Set `COPILOT_FORK_NAMESPACE_STRICT=1` in a test window to confirm namespaced IDs.
3. Run the collision audit (see below). Fix any remaining hardcoded identifiers not using helpers.
4. Validate commands & participants load (no duplicate ID errors in Dev Tools / logs).
5. (Optional) Enable label prefixing to visually differentiate while testing.
6. Remove the env var and rely on natural fork behavior (namespacing now auto‑applies because the ID differs).

### Collision Audit Script

```bash
# List registered commands during runtime (DevTools -> run in Extension Host console)
// vscode.commands.getCommands().then(list => console.log(list.filter(id => id.includes('copilot'))));

# Static grep for common registration patterns still using raw strings
grep -R "registerCommand(.*'github.copilot" src || true
grep -R "createChatParticipant" src | grep -v maybeNamespacedId || true
```

## Automated Rebase & Maintenance Workflow

All maintenance steps (including optional upstream sync) can be executed via `script/brand/maintenance.cjs`.

### What the Script Performs

| Step | Action | Notes |
|------|--------|-------|
| 0 (opt) | Upstream sync | Rebase or merge if `MAINT_AUTO_REBASE=1`. |
| 1 | Fetch upstream | Reports divergence (behind/ahead). |
| 2 | Engine check | Validates Node/npm (can ignore). |
| 3 | Install (optional) | `MAINT_CLEAN_INSTALL=1` triggers clean install. |
| 4 | Compile | Manifest overlay, build artifacts. |
| 5 | Brand audit | Detects new stray "GitHub Copilot" literals. |
| 6 | Unit tests | Retry on Tinypool flake; skip/tolerate via flags. |
| 7 | Namespace strict compile | Smoke test namespacing mode. |
| 8 | Auto commit/push | If `MAINT_AUTO_COMMIT=1` (and `MAINT_AUTO_PUSH=1`). |
| 9 | JSON summary | Machine-readable results. |

### Environment Flags (Summary)

| Variable | Effect |
|----------|--------|
| `MAINT_AUTO_REBASE=1` | Enable automated upstream sync (rebase default). |
| `MAINT_REBASE_STRATEGY=merge` | Use merge strategy. |
| `MAINT_UPSTREAM_BRANCH=upstream/main` | Upstream ref. |
| `MAINT_ALLOW_DIRTY=1` | Proceed with dirty tree. |
| `MAINT_STASH_DIRTY=1` | Auto stash/pop around sync. |
| `MAINT_TOLERATE_REBASE_CONFLICT=1` | Treat conflicts as non-fatal. |
| `MAINT_AUTO_COMMIT=1` | Auto commit changes. |
| `MAINT_COMMIT_MESSAGE` | Custom commit message. |
| `MAINT_AUTO_PUSH=1` | Push after auto commit. |
| `MAINT_PUSH_REMOTE=origin` | Remote. |
| `MAINT_PUSH_BRANCH` | Target branch. |
| `MAINT_CLEAN_INSTALL=1` | Clean install before build. |
| `MAINT_ALLOW_ENGINE_MISMATCH=1` | Ignore engine mismatch. |
| `MAINT_SKIP_TESTS=1` | Skip tests. |
| `MAINT_TOLERATE_TEST_FLAKE=1` | Tolerate Tinypool crash. |
| `COPILOT_FORK_NAMESPACE_STRICT=1` | Force namespacing (used in step 7). |

### Typical Hands-Off Sync

```bash
MAINT_AUTO_REBASE=1 MAINT_CLEAN_INSTALL=1 MAINT_ALLOW_ENGINE_MISMATCH=1 MAINT_TOLERATE_TEST_FLAKE=1 MAINT_AUTO_COMMIT=1 MAINT_AUTO_PUSH=1 npm run brand:maintain
```

The summary JSON will contain `autoSync` details (result, conflicts, postDivergence, commit SHA, push info).


### CI Integration Suggestion

Add a workflow step:

```bash
MAINT_ALLOW_ENGINE_MISMATCH=1 MAINT_TOLERATE_TEST_FLAKE=1 npm run brand:maintain
```

Fail build only if script exits non‑zero (indicates unhandled issues: stray literals or hard failures).

### Manual Extras (If Needed)

| Need | Manual Command |
|------|----------------|
| Update snapshots after intentional prompt change | `npm run test:unit -- -u` |
| Run simulation scenarios | `./script/simulate.sh` |
| Audit namespacing beyond smoke test | `COPILOT_FORK_NAMESPACE_STRICT=1 npm run compile` then launch dev host |

The previous manual checklist is retained in git history; this section supersedes it for routine maintenance.

---
This appendix formalizes the maintenance + namespacing process so future rebases remain predictable
and low risk.

