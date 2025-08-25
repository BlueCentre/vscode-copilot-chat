# Fork Strategy

## GPT-5

ipv1337: I have a very complex request that will require deep and thourough research of the current feature branch and the upstream main branch. Our current feature branch is trying to rebrand the vscode extension so that we can expand features while STILL leveraging the upstream open source project. When I rebase upstream main branch, there are always complex merge conflicts to resolve.  Looking at our current feature branch and comparing the upstream's main branch, tell me how we can reduce complex/large merge conflicts. Can we generally extend functionality and minimize changes to the codebase that we use by the upstream main branch?

GitHub Copilot: Using "Update Todo List"

I'll document the typical sources of your merge conflicts first, then proceed to architectural mitigation strategies.

Using "Update Todo List"

Using "Update Todo List"

Using "Update Todo List"

Using "Update Todo List"

Using "Update Todo List"

Using "Update Todo List"

Here's a deep strategy guide to reduce recurring, large merge conflicts while continuing your rebrand and functional extensions on top of the upstream `main`. I've structured this around what typically causes the conflicts, how to eliminate or quarantine them, workflow/process changes, and concrete implementation steps you can phase in.

## 1. Root Causes of Your Merge Conflicts

Likely high-churn collision zones:
1. package.json / package.nls.json: Extension ID, display name, activation events, contributed commands, dependencies.
2. Branding asset swaps inside assets (new files or overwriting upstream ones).
3. Direct edits inside core feature directories (conversation, `inlineChat`, `prompts`, `tools`, etc.) where upstream frequently refactors.
4. Wide-scope refactors (renaming folders, moving shared utilities) done in your branch before upstream does theirs → path divergence.
5. Formatting or stylistic diffs (tabs vs spaces already standardized, but added trailing commas, reordering exports, changing import grouping).
6. Dependency drift: Upstream bumping versions while your branch pins or introduces additional libs.
7. Shared constants or enums modified for feature flags or branding.
8. Hard-coded prompt changes in TSX prompt files (prompt-tsx) instead of layering/overriding.
9. Inlined experimental logic rather than using extension points/service registration indirection.
10. Test snapshot differences or simulation scenario changes diverging from upstream.

## 2. Architectural Isolation Patterns

Goal: Turn ongoing rebrand & feature additions into mostly additive code, avoiding edits to upstream-owned "core".

Key techniques:
1. Branding Configuration Layer
   - Introduce a `src/branding/` module exporting a typed `BrandConfig` (names, icons, color tokens, telemetry namespace, feature toggles).
   - All UI strings or image references import from this layer rather than hard-coded paths. Upstream file edits replaced by one-time insertion of an indirection line (after that stable).

2. Adapter & Facade Services
   - Wrap upstream services you extend (e.g., conversation orchestration, search, context resolution) in thin interfaces you control: `IConversationBrandAdapter`, `IPromptAugmentor`.
   - Upstream updates rarely touch your adapter implementation provided you keep the upstream-facing contract minimal.

3. Contribution/Decorator Registration
   - Instead of editing upstream participant factory code, create a `registerBrandParticipants()` invoked from a single, minimal hook file that upstream also calls (or you patch once). Inside, register additional participants, tools, intents.

4. Prompt Augmentation Pipeline
   - Replace direct prompt modifications with a pipeline architecture: Upstream builds base prompt -> passes through a list of augmentors (array of functions). You contribute new augmentors by pushing to a registry. Minimizes diff to a one-time insertion: turning a direct call into a loop/composition.

5. Feature Flags / Capability Map
   - Provide `FeatureToggles` object, read from env or config; upstream code remains generic (e.g., checks `features.brandEnhancedContext`), which you default to false upstream; your branch just sets true in `BrandConfig`. Where upstream won't accept these flags, isolate in optional wrappers.

6. Non-Invasive Monkey-Patching Avoidance
   - Eliminate runtime patching (if any) in favor of DI extension points (factories, strategy objects). Upstream code already uses service instantiation; lean on that via registering alternate implementations behind unique identifiers, not modifying original classes.

7. Stable Interposition Boundaries
   - Identify high-churn upstream files (git log frequency). For each, create a 'shim' file you own that upstream imports (if contributing back) or you minimally adjust once to delegate new logic to your code. Keep shim tiny (≤ ~15 lines) so merge conflicts are trivial.

8. Asset Indirection
   - Instead of replacing upstream copilot.png, keep original; add `assets/brand/agent.png` + a mapping in `BrandConfig` so code calls `getIcon('agent')`. Only one upstream file needs a lookup addition.

9. Test Extension Hooks
   - Add a test harness hook `applyBrandTestFixtures(registry)` so new tests live under `test/brand/**` and don’t modify upstream test sets.

## 3. Git Workflow & Tooling

1. Upstream Tracking Branches
   - Maintain a clean `origin/main` (upstream mirror) & `origin/rebrand-base` which is `main` plus ONLY your invariant, minimal indirection commits (adapters, config scaffolding). Feature work branches from `rebrand-base`, not the heavy rebrand branch.

2. Patch Series / Quilt Approach
   - Split changes into logical series:
     - Series A: Indirection infrastructure (small, upstream-friendly)
     - Series B: Pure additive features (new dirs only)
     - Series C: Branding (config + assets + string map)
     - Series D: Experimental features
   - Each series kept rebase-clean; large rebrand branch is an integration branch merging the series.

3. High-Frequency Mini-Rebase
   - Daily (or CI-scheduled) automated rebase of each series branch onto upstream `main`, with a script failing if conflicts exceed threshold (line count heuristic).

4. Git Attributes / Merge Drivers
   - Configure .gitattributes for:
     - Prompt TSX files: `merge=union` (if safe) or custom driver that defers to upstream then replays your augmentor registrations.
     - JSON manifests (package.json): use `jq` merge driver to merge arrays (activationEvents, contributes.commands) predictably.
   - Example entry:
     ```
     package.json merge=packagejson
     *.prompt.tsx merge=tsxprompt
     ```
     plus corresponding driver scripts.

5. Enable `git rerere` globally to auto-apply previously resolved conflicts.

6. Strict Commit Hygiene
   - No unrelated refactors interleaved with feature logic. Avoid mass import reorder commits unless upstream has standardized.

7. Conflict Budget Guard
   - CI job runs: attempt `git rebase upstream/main` in a container; counts conflict markers. If > N (e.g., 200), job fails early signaling need to refactor isolation.

8. Periodic Upstream Contribution
   - Where indirection is broadly useful, upstream a portion so future diffs shrink (e.g., prompt augmentation pipeline accepted upstream).

## 4. Repository Structure Adjustments

Proposed additive directories (all new = low conflict):
```
src/brand/
  BrandConfig.ts
  features.ts
  assets.ts
  promptAugmentors/
src/extension/brandHooks/
  registerBrandParticipants.ts
  registerPromptAugmentors.ts
test/brand/
scripts/drift/
  detect-drift.mts
```

Support files:
- `scripts/drift/detect-drift.mts`: Compares `git diff upstream/main --name-status` filtering only disallowed paths (core files) & fails if modifications exceed allowlist.
- .gitattributes: merge driver declarations.
- `branding.d.ts` (ambient types if needed for config injection).

Minimal modifications to upstream code:
1. In extension activation file: insert one line:
   ```
   import { registerBrand } from '../brandHooks/registerBrand';
   registerBrand(services);
   ```
2. In prompt builder: replace direct assembly with loop over registry (added lines < 10).
3. In participant registration: call `registerBrandParticipants(context)`.

## 5. Automation & CI Guards

CI pipeline additions:
1. Drift Detector Job
   - Runs after test build; ensures only allowed core edits (whitelist file list) vs upstream main. Provide override label for intentional divergences.
2. Rebase Simulation Job
   - Fetch upstream main, clone branch, run scripted rebase; store metrics (conflict count, touched files) as build artifact & comment on PR.
3. Merge Driver Validation
   - Run a synthetic conflict test (modify same known file in two branches) to ensure custom merge driver output is deterministic.
4. Prompt Integrity Test
   - Ensure augmentation registry produces identical base prompt when all augmentors disabled (guarding unintentional diffs).
5. Brand Off Switch Test
   - Set env `BRAND=none` and run tests to ensure extension still loads with upstream baseline semantics (verifies isolation).
6. Lint Rule / ESLint Plugin
   - Custom rule blocking imports from `src/extension/...` directly in branding modules if that would create reverse coupling; enforce using service interfaces.
7. Bundle Size Delta Check
   - Track brand additive size; ensures no accidental duplication of large assets causing friction upstream may reject later if contributing.

## 6. Implementation Step Roadmap

Phased delivery:

Phase 0 (Prep – Fast Wins)
- Enable `git rerere`
- Add .gitattributes with naive merge drivers (maybe start with `text` + no CRLF issues)
- Introduce `src/brand/BrandConfig.ts` + one usage (icon path indirection)
- Move branding assets under `assets/brand/`

Phase 1 (Indirection Infrastructure)
- Prompt augmentor registry (non-invasive; adapt builder call)
- Participant/tools registration hook
- Feature toggle object and typed accessor
- Add drift detection script + CI job

Phase 2 (Refactor Existing Divergent Edits)
- Replace direct brand modifications in core with config calls
- Migrate prompt customizations into augmentors
- Shrink diff size by reverting now-unneeded core file edits

Phase 3 (Merge Driver & Advanced CI)
- Implement custom package.json merge driver (Node script merging JSON)
- Implement prompt TSX merge driver (parse AST via `@typescript-eslint/typescript-estree` and regenerate)
- Add rebase simulation job & metrics reporting

Phase 4 (Upstream Contribution)
- Upstream PR proposing generic prompt augmentation + brand hook stubs (if acceptable)
- Adopt upstream once merged; drop local patch lines

Phase 5 (Governance & Maintenance)
- Quarterly review: list remaining core file diffs >50 lines; create tickets to eliminate
- Add CODEOWNERS to core directories requiring justification for edits

## 7. Risks, Tradeoffs, Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-abstraction complexity | Slower dev | Keep adapter interfaces minimal & documented |
| Upstream rejects hook contributions | Persist local patch maintenance | Keep shim patches < 15 LOC & clearly separated |
| Merge drivers introduce subtle incorrect merges | Hidden regressions | Add post-merge validation tests (JSON schema diff, AST diff of functional nodes) |
| Feature flags drift (unused toggles) | Dead code | Lint rule: fail if flag defined but not referenced in 2 releases |
| CI noise (false positives in drift) | Developer fatigue | Allow override label + cached baseline hashes |

## Concrete Examples

1. BrandConfig pattern:
```
export interface BrandConfig {
	name: string;
	icons: { agent: string; };
	features: { enhancedContext: boolean; experimentalTools: boolean; };
}

export const brand: BrandConfig = {
	name: process.env.BRAND_NAME ?? 'Vitruvian',
	icons: { agent: 'assets/brand/agent.png' },
	features: {
		enhancedContext: true,
		experimentalTools: process.env.EXPERIMENTAL === '1'
	}
};
```
Core code formerly importing `'assets/agent.png'` now:
```
import { brand } from '../../brand/BrandConfig';
iconPath = brand.icons.agent;
```

2. Prompt augmentor registry:
```
type PromptAugmentor = (ctx: BuildContext, prompt: PromptParts) => void;

const augmentors: PromptAugmentor[] = [];
export const registerPromptAugmentor = (fn: PromptAugmentor) => augmentors.push(fn);

export const applyAugmentors = (ctx, prompt) => {
	for (const fn of augmentors) {
		fn(ctx, prompt);
	}
};
```
Builder change (single patch):
```
const prompt = buildBasePrompt(...);
applyAugmentors(context, prompt);
return prompt;
```

3. package.json merge driver script (outline):
- Parse both sides & base
- Merge `contributes.commands` by `command` key
- Merge `activationEvents` (set union)
- Prefer upstream version for dependencies unless your version is greater & semver-compatible.

## Minimal Upstream File Touch Inventory

After refactor, only these upstream-managed files need local line-level changes:
- Extension activation file (brand registration call)
- Prompt builder (augmentor application)
- Possibly participant registry (call to brand participants)

All other differences path-additive or config-only.

## Actionable Next Steps (Start Tomorrow)

1. Implement `BrandConfig` + migrate 1–2 icon usages.
2. Add prompt augmentor registry + move one existing brand change into augmentor.
3. Add drift detection script & run locally to gauge current divergence size.
4. Split current rebrand branch into series branches (in parallel):
   - `series/indirection`
   - `series/branding-assets`
   - `series/features-X`
5. Schedule automation for nightly rebase simulation.

(Optional: I can scaffold initial files & scripts if you want me to proceed.)

## Summary

By introducing a thin branding/config layer, a prompt augmentation pipeline, centralized registration hooks, and CI-driven drift detection plus merge drivers for structured files, you convert recurring large merge conflicts into small, predictable, and often automatic merges. Pairing that with a disciplined branch + patch series workflow drastically lowers conflict resolution cost. Upstream-friendly abstractions further reduce long-term divergence.

Let me know if you’d like me to:
- Create the initial `src/brand/` scaffolding
- Draft .gitattributes and merge driver stubs
- Add a drift detection script

Just say the word and I’ll implement the first batch.
