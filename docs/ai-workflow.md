# AI workflow

How AI tools are used on this project, and how their output is checked. This is a running log that gets a new entry at each milestone.

## Tools

- **Claude Code** (Anthropic, Claude Opus 5.5) in the VS Code extension. It's used for drafting docs, scaffolding, writing code and tests, and reviewing changes.

## Working principles

1. **I own the decisions.** AI proposes and I decide. Scope, the data model, and trade-offs are recorded in the docs with their reasons.
2. **One small increment at a time.** The app isn't generated in one go. Each prompt covers one slice, and its output is reviewed before it's committed.
3. **Verify, don't trust.** Generated code is run (tests, lint, type check, and the app itself) before it's committed. Generated docs are checked against the code that actually exists.
4. **Tests come from requirements.** Test cases are derived from `requirements.md`, not only from whatever the implementation happens to do.
5. **Keep a record.** Notable prompts, corrections, and AI mistakes are logged below.

## Log

### Milestone 1–2: requirements, setup, and CI

**Prompts given**
- The assessment brief and a draft milestone plan, with a request to write `docs/requirements.md`.
- A request to move the Rails-generated CI workflow from `backend/.github/` to the repository root and add frontend lint and type checks.
- A request to draft `architecture.md`, `planning.md`, and this file, and to propose a commit order so each doc lands in the history when its content becomes true.
- A review round on those drafts asking for a deeper data model section and for the API outline to be removed until the API exists.

**What AI produced**
- A first draft of the one-page requirements: scope, key decisions, and exclusions with their reasons.
- A root CI workflow, with backend jobs scoped to `backend/` (including the RuboCop cache path, which `actions/cache` resolves from the repo root) and a new frontend job running lint, type check, and build.
- A `typecheck` npm script.
- Drafts of the architecture, milestone plan, and this log.

**What AI caught**
- The root `.gitignore` had been copied from the Rails template with root-anchored paths (`/.env*`, `/config/*.key`), so `backend/.env` and `backend/config/master.key` **would have been committed**. These were fixed and verified with `git check-ignore` before the first commit.

**What was corrected or checked**
- The first attempt to move the CI file used `git mv -k` on an untracked file, which silently did nothing. This was spotted by listing the directory afterwards and redone with `mv`.
- Lint and type check were run locally before CI was set up, and the workflow YAML was checked to make sure it parses.
- While drafting the architecture, the "per department" insight in the requirements turned out to risk mixing currencies, so department and job-title statistics are now scoped to one country.

**My review and changes**
- **Set the milestone plan myself.** I gave the AI my own milestone breakdown up front, so the plan reflects my sequencing (requirements, then vertical slices, then deployment) rather than a generic template.
- **Made the data model the centre of the architecture.** The first draft treated it as a single table listing. Since every screen either edits or aggregates employee rows, I asked for it to be expanded: database constraints alongside model validations, an entity diagram, the reasoning behind each type choice, which index serves which query, and how the schema can grow (salary history, lookup tables, exchange rates).
- **Removed the API outline for now.** Writing endpoint signatures before any controller exists would document a contract that isn't real yet and would likely drift. It will be added in milestone 3, written from the routes and request specs.
- **Accepted the currency-scoping change** to department and job-title insights after checking it against the "never mix currencies" decision in `requirements.md`.
- **Checked the docs against the repo**: the CI paths, the `.gitignore` fix, and the scripts mentioned all exist as described.
