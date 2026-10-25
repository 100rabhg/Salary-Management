# AI workflow

How AI tools are used on this project and how their output is checked. A running log, one entry per milestone.

## Tools

- **Claude Code** (Anthropic, Claude Opus 5.5) in the VS Code extension: docs, scaffolding, code, tests and reviews.

## Working principles

1. **I own the decisions.** AI proposes, I decide. Scope, data model and trade-offs are recorded in the docs with reasons.
2. **One small increment at a time.** Each prompt covers one slice; its output is reviewed before commit.
3. **Verify, don't trust.** Generated code is run (tests, lint, type check, the app) before commit; generated docs are checked against the code.
4. **Tests come from requirements**, not from whatever the implementation does.
5. **Keep a record** of notable prompts, corrections and AI mistakes below.

## Log

### Milestone 1–2: requirements, setup, and CI

**Prompts given**
- The brief and a draft milestone plan, asking for `docs/requirements.md`.
- Move the Rails CI workflow from `backend/.github/` to the repo root and add frontend lint and type checks.
- Draft `architecture.md`, `planning.md` and this file, with a commit order that lands each doc when it becomes true.
- A review round: deepen the data model section; drop the API outline until the API exists.

**What AI produced**
- The one-page requirements draft (scope, key decisions, exclusions with reasons).
- A root CI workflow with backend jobs scoped to `backend/` (including the RuboCop cache path, which `actions/cache` resolves from the repo root) and a frontend job for lint, type check and build.
- A `typecheck` npm script, and drafts of the architecture, plan and this log.

**What AI caught**
- The root `.gitignore`, copied from the Rails template, had root-anchored paths (`/.env*`, `/config/*.key`), so `backend/.env` and `backend/config/master.key` **would have been committed**. Fixed and verified with `git check-ignore` before the first commit.

**What was corrected or checked**
- `git mv -k` on an untracked CI file silently did nothing; spotted by listing the directory and redone with `mv`.
- Lint and type check ran locally before CI existed; the workflow YAML was checked to parse.
- The "per department" insight risked mixing currencies, so department and job-title statistics are scoped to one country.

**My review and changes**
- **Set the milestone plan myself** (requirements, vertical slices, then deployment) instead of a generic template.
- **Made the data model the centre of the architecture.** The first draft was a table listing; I asked for database constraints next to model validations, an entity diagram, reasons for each type, which index serves which query, and how the schema can grow.
- **Removed the API outline** until milestone 3, to be written from the routes and request specs rather than drift ahead of the code.
- **Accepted the currency-scoping change** after checking it against "never mix currencies".
- **Checked the docs against the repo**: CI paths, the `.gitignore` fix and the scripts exist as described.

### Milestone 3a: employee data model and seed data

**Prompts given**
- Rules: read the docs and code first, check git status, propose schema, types, constraints, indexes and doc/code gaps, then wait for approval. No controllers, API or frontend; no floating-point money; no cross-currency aggregation. A deterministic, re-runnable 10,000-employee seed with no real personal data. No destructive database commands, no commits.
- Approval with decisions: whole-number JPY, eight countries, re-seeding skips existing employees, milestone 3 split into 3a (data) and 3b (API), redundant `country_code` index dropped. Refinements: every country and country-scoped group covered, case-insensitive email uniqueness tested in Rails and PostgreSQL, isolated tests, and a final plan with the exact file list before editing.
- Database/model split: keep `NOT NULL`, case-insensitive unique email and positive salary in the database; non-blank strings, employment types, country–currency matching and whole JPY in the model; all covered by RSpec and documented in `architecture.md`.
- Clean-up: remove the seed spec, keep model specs, align docs with the code.

**What AI produced**
- The `employees` migration and `Employee`, `EmployeeSalary`, `Country` (`app/models/`).
- `EmployeeSeed` (`lib/employee_seed.rb`) and `db/seeds.rb`.
- Model specs; database-level examples use raw SQL inserts to bypass Rails.
- Updates to `architecture.md` and `planning.md`.

**What was corrected or checked**
- The employee spec called a non-existent helper (`errors_on_validation`); replaced with a local one before running.
- Seeding was slow because `Range#count` walked ~5,100 hire dates per row; the day count is now computed once.
- The generator, checked in memory: exactly 10,000 rows, unique emails, identical on re-run, per-country headcounts match the weights, smallest country–job-title group 14 and country–department group 40.
- RuboCop clean on `app`, `lib`, `db`, `spec`.
- `db:seed` run twice in development: 10,000 inserted, then 0 inserted and 10,000 skipped.
- Test database recreated and migrated: 48 examples, 0 failures.

**My review decisions**
- Chose eight countries, whole-number JPY, and skip-on-reseed so HR edits are never overwritten.
- Kept 3a to the data layer; salary history moved to 3b and the API to 3c.
- Decided which rules live in the database and which in the model ("Where each rule is enforced" in `architecture.md`).
- Removed the seed spec.

### Milestones 3c and 4: employee API and frontend

**Prompts given**
- Planning for 3c and 4, no file changes: API, pages, flows, validation, edge cases, sequence, open questions. Covered past/current/future salary changes, one pending period, editing or cancelling a pending period, concurrency, a dummy HR profile, navy-and-teal design, server-side pagination, env-based config and removing the Vite starter. The UI used the UI/UX Pro Max skill.
- Implementation, with decisions on the open questions:
  - Asia/Kolkata business time zone; keep deleting employees.
  - Ask for the joining date once and use it as the first salary's effective date, in one transaction.
  - Any period (initial, past, current, pending) is editable for corrections; only pending can be cancelled; at most one pending.
  - Country and salary currency are independent: currency defaults to the country's (INR for India), app default INR, and a country change never alters, converts, cancels or blocks a period.

**What AI produced**
- The plan, including gaps: all periods immutable, nothing enforced one pending period, no business time zone, CI ran no tests, CORS disabled, architecture-listed frontend libraries not installed, invalid npm package name.
- A migration (unique `(employee_id, effective_on)`, `lock_version` columns) and the period rules in `Employee` and `EmployeeSalary`, with locked write methods.
- `/api/v1` endpoints, `EmployeeDirectoryQuery`, serializers, a uniform error format, rack-cors, and a CI job running RSpec on PostgreSQL.
- The React app: shell with demo HR profile, directory, profile, employee and salary modals, typed API client, Vitest tests (in CI).
- Updates to `requirements.md`, `architecture.md` (rules, concurrency, API, UI, config), `planning.md`, READMEs and `.env.example` files.

**What AI caught**
- The first concurrency spec **passed with the lock removed**: the threads never overlapped. It now holds each request between its "one pending" check and its insert; it fails with four pending rows without the lock and passes with it (both checked).
- A row lock can't stop an edit from an outdated copy, so optimistic locking (`lock_version`) was added. The edit modal sends the version it opened with, so a retry after a conflict can't overwrite the other user's change.
- The edit modal set parent state during render to track unsaved changes; replaced with a ref before running.
- Headless-Chrome screenshots against seeded data showed a truncated filter placeholder; shortened.
- Errors read "Effective on can't be…"; HR-friendly names added ("Effective date", "Joining date").

**What was corrected or checked**
- Mantine 9 and React Router 8 are newer than the AI knew well, so their types were checked first (Mantine dates use `YYYY-MM-DD` strings; `env="test"` disables transitions in jsdom). Early tests used the wrong ARIA role for Mantine selects until fixed.
- A flaky directory test asserted before the debounced request was sent; it now waits, and the suite ran three times green.
- `bundle exec rspec`: 116 examples, 0 failures; RuboCop, Brakeman, bundler-audit clean. Frontend: lint, type check, 30 tests and build pass.
- On 10,000 rows a warm directory request takes ~10–60 ms, including search and page 400. Curl smoke tests (back-dated period becomes current, second future period rejected, effective period can't be cancelled); test records then removed.
- Each commit builds and passes its tests on its own.

**My review decisions**
- Chose Asia/Kolkata and kept deleting employees.
- Joining date = first salary's effective date; every period editable for corrections, at the cost of no audit trail yet (out of scope).
- Separated salary currency from country, so insights must group by currency as well as country.

**Review round on the UI**
- After using the app I asked to merge the directory's current-salary and scheduled-change columns, sort on every column, stop the profile's scheduled-change and last-change cards looking empty, and add left padding to both tables. I had removed the country hint from the edit form myself.
- AI added server-side sorts for role, country (by name) and salary (by currency, then amount, so currencies are never ranked against each other); merged the three profile cards into one salary card showing a scheduled change only when there is one; widened padding. Checked by screenshots with and without a scheduled change, desktop and phone, and timed the new sorts on 10,000 rows (under 70 ms).

### Milestone 5: Dashboard and insights

**Prompts given**
- Planning, no file changes: a Dashboard (headcount, estimated monthly cost) and an Insights page with three reports in one display currency (default INR) without converting stored salaries, plus an evaluation of Frankfurter for daily rates cached without Redis.
- Revision: Frankfurter limited to the six currencies with ECB selected explicitly; complete, validated, dated snapshots in the database with fallback to the last good one; `/` as a summary-only Dashboard; per-report filters, the country report grouping by country rather than filtering; one snapshot for every chart on a page; a defined response when none exists; annual ranges vs monthly costs; percentile precision and JPY rounding.
- Implementation: approved the recommendations; asked for **exact numeric percentiles**, tests for calculations, filtering, rate failures, stale data, UI states and 10,000-row performance; leave uncommitted.

**What AI produced**
- Updates to `requirements.md`, `architecture.md` (insight calculations, Exchange rates, endpoints, config), `planning.md`, and the new `performance-considerations.md`.
- `exchange_rate_snapshots` and `exchange_rates` tables, Frankfurter client, snapshot validation and refresh, cache-first resolver with advisory lock and failure backoff, and `bin/rails exchange_rates:refresh`.
- Insight query objects (`app/queries/insights/`): shared current-salary CTE, `numeric` conversion before aggregation, exact interpolated percentiles, per-report filter allowlists. Endpoints under `/api/v1/insights` and `/api/v1/exchange_rates/current`.
- Dashboard and Insights pages: currency picker, rates note, snapshot pinning, per-report URL filters, accessible bar and range charts with table views, and loading, error, empty, stale and rates-unavailable states.
- Specs and tests worked out by hand from known data.

**What AI caught**
- Frankfurter v2 **blends providers by default**: without `providers=ECB` it returned a Sunday-dated non-ECB rate. Requests always name ECB, and validation rejects weekend dates.
- Frankfurter's cross rates are rounded (USD→INR 94.94 vs exact 94.945), so ECB's EUR-based rates are stored and cross rates computed in `numeric`.
- `percentile_cont` returns `double precision` and rounds half-to-even. Percentiles are interpolated in `numeric` instead, and every figure rounded once, half away from zero, to the display currency's minor unit (0 for JPY).
- The first lock spec passed for the wrong reason: Rails shares one connection across test threads, and advisory locks are re-entrant per session. It now holds the lock from a separate connection.
- A frontend test leaked the chosen currency through `localStorage`; storage is now cleared between tests.
- `Intl` formatted 6,435 crore as "₹6.4KCr"; large INR amounts now show in crores.

**What was corrected or checked**
- The plan named `@mantine/charts`; the charts were built as small HTML/CSS components following the dataviz skill's mark specs (bars ≤24px, 4px rounded ends, hairline gridlines, no per-mark labels, tooltip plus table view). Exact control, works in jsdom, keeps Recharts out of the bundle.
- On 10,000 rows the exact percentiles match `percentile_cont` within rounding (max difference ₹0.0049), and every report answers in ~35–110 ms over HTTP.
- A dev server booted before `app/services/` existed returned 500s for the new endpoints; a fresh server worked, so not a code fault (restart after pulling).
- Backend: 173 examples, 0 failures, including the 10,000-row performance spec; RuboCop clean; Brakeman no warnings, one documented ignore for a query built from quoted, allowlisted values; bundler-audit clean. Frontend: lint, type check, 51 tests and build pass.

**Refactor: exchange rates in memory instead of the database**
- Prompt: replace database rate storage with Rails `memory_store` only (no Redis, no table), same config in development, test and production, with an opaque cache token instead of snapshot IDs. Roll back only the exchange-rate migration locally, leaving employee and salary data untouched.
- The migration was reverted with `db:migrate:down` for that version in development and test, dropping only `exchange_rates` and `exchange_rate_snapshots`. The file was deleted and `schema.rb` matches the committed version. Employee and salary counts were the same before and after (10,001 and 10,006 in development).
- Each validated response is one `RateSet` in `Rails.cache`, keyed by a SHA-256 token of the data. The refresh lock is a per-process `Mutex`; the failure backoff a cache entry expiring after 5 minutes. An unknown token returns 409 and the page re-pins.
- **What AI caught:** `32.megabytes` isn't available in environment files at load time, so the size is in bytes. `Data` objects are frozen, so the token isn't memoized. The first re-pin version refetched every report on any 409, including ones on the old token, looping until the test worker ran out of memory; re-pinning now runs once at a time, at most once a minute per token, and reruns only reports pinned to the new token.
- **Checked live:** after a restart the old token got 409, and refetching gave the same token because the rates were unchanged. Backend: 176 examples, 0 failures; RuboCop, Brakeman, bundler-audit clean. Frontend: lint, type check, 53 tests and build pass.
