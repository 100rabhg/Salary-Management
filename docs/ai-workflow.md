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

### Milestone 3a: employee data model and seed data

**Prompts given**
- A milestone prompt with working rules: read the docs and existing code first, and check git status. Propose the schema, types, constraints and indexes, plus any gaps between the docs and the code, and wait for approval. No controllers, API or frontend. No floating-point money, and no aggregation across currencies. A deterministic, re-runnable seed for 10,000 employees with no real personal data. No destructive database commands and no commits.
- An approval with decisions:
  - JPY salaries must be whole numbers.
  - Eight countries.
  - Re-seeding skips existing employees rather than overwriting them.
  - Milestone 3 is split into 3a (data) and 3b (API).
  - The redundant `country_code` index is dropped.

  Refinements: guaranteed coverage for every country and every country-scoped group, case-insensitive email uniqueness tested at both the Rails and PostgreSQL levels, and isolated tests. The prompt asked for a final plan and the exact list of files before any editing.
- A review prompt on the database/model split: keep `NOT NULL`, the case-insensitive unique email and the positive salary in the database. Enforce non-blank strings, employment types, country–currency matching and the JPY whole-number rule in the Rails model. Keep them covered by RSpec, and document the decision and its trade-offs in `architecture.md`.
- A clean-up prompt: remove the seed spec, keep the model specs, and bring the docs in line with the implementation.

**What AI produced**
- The `employees` migration, plus `Employee`, `EmployeeSalary`, and `Country` (`app/models/`).
- The seed generator `EmployeeSeed` (`lib/employee_seed.rb`) and `db/seeds.rb`.
- Model specs for `Employee`, `EmployeeSalary` and `Country`. Database-level examples use raw SQL inserts, so they exercise the database without going through Rails.
- Updates to `architecture.md` and `planning.md`.

**What was corrected or checked**
- The first draft of the employee spec called a helper that doesn't exist (`errors_on_validation`). It was replaced with a small local helper before the suite was run.
- Generating 10,000 rows was slow because `Range#count` walked about 5,100 hire dates for every row. The number of days is now calculated once.
- The generator was checked in memory:
  - it produces exactly 10,000 rows with unique emails, and identical output on repeated runs;
  - per-country headcounts match the fixed weights;
  - the smallest country–job-title group has 14 employees and the smallest country–department group has 40.
- RuboCop reports no offences on `app`, `lib`, `db` and `spec`.
- The developer ran `db:seed` twice in development: the first run inserted 10,000 employees, and the second inserted 0 and skipped 10,000. `Employee.count` was 10,000.
- The developer recreated and migrated the test database, then ran `bundle exec rspec`: 48 examples, 0 failures.

**My review decisions**
- Chose the eight countries, the whole-number rule for JPY, and skip-on-reseed so that HR edits are never overwritten.
- Kept milestone 3a limited to the data layer. The plan now places salary history in 3b and the API in 3c.
- Decided which rules the database enforces and which belong to the model (see "Where each rule is enforced" in `architecture.md`).
- Removed the seed spec from the suite.

### Milestones 3c and 4: employee API and frontend

**Prompts given**
- A planning prompt for 3c and 4 together, with no file changes: review the repo and propose the API, pages and flows, data and validation rules, edge cases, sequence and open questions. It covered salary changes with past, current or future dates, one pending period per employee, editing or cancelling a pending period until it takes effect, protection against concurrent requests, a dummy HR profile, the navy-and-teal design, server-side pagination, environment-based configuration and removing the Vite starter. The UI part used the UI/UX Pro Max skill.
- An implementation prompt with decisions on the plan's open questions:
  - Asia/Kolkata as the business time zone, and keep deleting employees.
  - Ask for the joining date once and use it as the first salary's effective date, in the same transaction.
  - Let HR edit any salary period (initial, past, current or pending) to correct mistakes; cancel only a pending one; at most one pending period.
  - Keep the employee's country and the salary currency independent. The currency defaults to the country's (INR for India), the app-wide default is INR, and a country change must not alter, convert, cancel or block any salary period.

**What AI produced**
- The plan, including gaps found in the existing code and docs: every salary period was immutable, nothing enforced "one pending period", there was no business time zone, CI ran no tests, CORS was disabled, the frontend libraries named in the architecture weren't installed, and the npm package name was invalid.
- A migration (unique `(employee_id, effective_on)` index, `lock_version` columns) and the salary-period rules in `Employee` and `EmployeeSalary`, with locked write methods.
- The `/api/v1` endpoints, `EmployeeDirectoryQuery`, serializers, a uniform error format, rack-cors, and a CI job running RSpec against PostgreSQL.
- The React app: app shell with the demo HR profile, directory, profile, add/edit employee and salary modals, a typed API client, and Vitest tests (also run in CI).
- Updates to `requirements.md`, `architecture.md` (rules, concurrency, API, UI design, configuration), `planning.md`, the READMEs and the `.env.example` files.

**What AI caught**
- The first concurrency spec **passed even with the lock removed**: the threads never overlapped, so it proved nothing. The spec now holds each request between its "one pending" check and its insert. It fails with four pending rows without the lock and passes with it; both runs were checked.
- A row lock alone can't stop an edit based on an outdated copy, so optimistic locking (`lock_version`) was added. The edit modal sends the version it was opened with, not the latest one, so a retry after a conflict can't silently overwrite the other user's change.
- The first draft of the edit modal set parent state during render to track unsaved changes. It was replaced with a ref before running.
- Screenshots of the running app (headless Chrome against the seeded database) showed a truncated filter placeholder, which was then shortened.
- Error messages read "Effective on can't be…"; HR-friendly attribute names were added ("Effective date", "Joining date").

**What was corrected or checked**
- Mantine 9 and React Router 8 are newer than the versions the AI knew well, so their type definitions were checked before use (for example, Mantine dates now use `YYYY-MM-DD` strings, and Mantine's `env="test"` turns off transitions in jsdom). The first component tests looked for the wrong ARIA role for Mantine selects and failed until this was fixed.
- One directory test was flaky: it asserted the request log before the debounced request had been sent. It now waits, and the suite was run three times in a row.
- `bundle exec rspec`: 116 examples, 0 failures. RuboCop, Brakeman and bundler-audit report nothing. Frontend: lint, type check, 30 Vitest tests and the production build all pass.
- On the 10,000-row development database a warm directory request takes about 10–60 ms, including search and page 400. The API was smoke-tested with curl (a back-dated period becomes current, a second future period is rejected, an effective period can't be cancelled), and the test records were then removed.
- Each commit was checked to build and pass its tests on its own.

**My review decisions**
- Chose Asia/Kolkata as the business date, and kept deleting employees.
- Decided that the joining date is the first salary's effective date, and that every salary period stays editable for corrections, at the cost of having no audit trail yet (recorded as out of scope).
- Separated salary currency from country, which means future insights must group by currency as well as country.
