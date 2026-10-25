# Requirements: ACME Salary Management

## Goal

Replace the spreadsheets ACME's HR team uses for 10,000 employees across several countries with a web app. In it, the HR Manager keeps salary data accurate and answers "how do we pay people?" without building pivot tables.

## User and problem

**Persona:** the HR Manager. They are comfortable with spreadsheets but not technical. They look people up, change records, and answer questions from leadership such as "What do we pay engineers in India?"

**Pain today:** the data is spread across spreadsheets, edits are manual and unvalidated, and every question needs a pivot table built by hand.

## Scope and features (in)

1. **Employee directory.** Server-side search by name or email, filters (country, department, job title, employment type), sorting and pagination that stay fast at 10,000 rows.
2. **Manage employees.** Create, view, edit and delete. Creating an employee also records their first salary, effective on the joining date. Input is validated: required fields, unique email, positive salary, supported currency.
3. **Salary history.** Every change adds a dated period that is past, current or pending, with at most one pending period per employee. HR can correct any period and cancel a pending one.
4. **Dashboard.** Headcount and estimated monthly and annual cost.
5. **Insights.** Monthly cost by department, salary range by role, and salary distribution by country (minimum, 25th percentile, median, 75th percentile, maximum and mean), each with its own filters.
6. **Seed data.** A repeatable script that creates 10,000 realistic employees with salary history.
7. **Quality and delivery.** Fast, deterministic tests in CI. The app is deployed, with a video demo.

## Key decisions

- **Salaries stay in their original currency.** Each period has its own currency, defaulting to the country's. Reports convert to one display currency (default INR) at read time with dated ECB rates, label the results as estimates, and never mix currencies in one statistic.
- **One annual base salary per period.** Costs are shown monthly (annual ÷ 12) and ranges annually.
- **"Today" is a business date in Asia/Kolkata**, so the API, the database and the UI agree on which period is current.
- **Figures come from live data**, never precomputed, and percentiles are exact.
- **Stack:** Rails API, PostgreSQL, React with TypeScript.

## Deliberately out of scope (and why)

| Excluded | Why |
| --- | --- |
| Authentication and roles | One persona and synthetic data. It's the first item for a real rollout; a fixed demo HR profile stands in. |
| Audit log of changes | Belongs with authentication. Until then, corrections overwrite. |
| Historical or live exchange rates | Today's estimate answers the questions. More needs a rate policy and paid data. |
| Pay trends and forecasting | The reports describe current pay. |
| Bonus, equity and benefits | Base salary answers the core questions; total compensation multiplies the complexity. |
| Payroll, tax and payslips | A different product, with law that varies by country. |
| Excel/CSV import and export | The seed covers the initial load. Import needs proper validation and error reporting. |
| Org hierarchy and approvals | Not needed to manage or analyse pay. |
| Translations and a formal accessibility audit | A single English-speaking persona. Components are accessible by default. |

## Success criteria

- HR finds any employee in under 2 seconds and changes a salary in a few clicks.
- No employee ever has two pending periods, even when two saves happen at once.
- Every figure comes from a query over current data, changes right after an edit, and shows its rate date and source.
- List and insight endpoints stay responsive at 10,000 employees, and CI is green on every push.

The detailed rules, definitions and design are in [architecture.md](architecture.md).
