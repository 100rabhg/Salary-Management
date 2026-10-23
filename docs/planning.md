# Planning

## Approach

Requirements come first, then one complete vertical slice at a time: backend, tests, UI, and a commit. Polish is added only after the core workflows work end to end. Each milestone ends in one or more working commits, so the git history shows how the solution evolved.

## Milestones

| # | Milestone | Key outputs | Status |
| --- | --- | --- | --- |
| 1 | Requirements and planning | `requirements.md`, `architecture.md`, this plan, Git repo | Done |
| 2 | Application setup | Rails API and React app scaffolded, CI (lint, type check, security scans), both run locally | Mostly done (needs a CI run on GitHub and the local DB checked) |
| 3a | Employee and salary data model | `Employee` and `EmployeeSalary` models, two-table schema, `Country` list, deterministic seed script with one starting salary period per employee, model specs | Draft for review |
| 3b | Salary history | Add salary periods for later changes, current-effective-salary lookup, effective-date handling, and model specs | Draft for review |
| 3c | Employee API | CRUD and salary-history endpoints, transactional employee/initial-salary creation and country changes, request specs, API section in `architecture.md` | Not started |
| 4 | Frontend core workflows | Employee directory (search, filters, pagination), create/edit/delete, loading, empty, and error states | Not started |
| 5 | Salary insights | Insights endpoints (query objects), Insights page, figures checked against the data | Not started |
| 6 | Testing and quality | Gaps in test coverage closed, error handling reviewed, behaviour verified with 10k records | Not started |

## Commit strategy

- Small, working increments with conventional prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Tests are committed together with the feature they cover, not in one batch at the end.
- Docs are added when their content becomes true. For example, `performance-considerations.md` is written after the app has been measured with 10k rows. Design trade-offs are recorded in `architecture.md` next to the decision they belong to.

## Definition of done (per feature)

- Behaviour matches `requirements.md`.
- Specs or tests cover the happy path and the main failure paths.
- Lint, type check, and the full test suite pass in CI.
- Loading, empty, and error states are handled in the UI.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Aggregates silently mix currencies | All statistics are grouped or scoped by country, and specs assert that this holds |
| Slow list or insights queries at 10k rows | Server-side pagination, indexes on filter columns, SQL aggregation, and timings measured on seeded data |
| AI-generated code that looks right but is wrong | Every change is reviewed and run, and tests are written against the requirements rather than the implementation (see `ai-workflow.md`) |
| Running out of time before deployment | Deploy early (after milestone 4) rather than at the end |
