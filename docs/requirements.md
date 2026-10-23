# Requirements: ACME Salary Management

## Goal

Replace the spreadsheets that ACME's HR team uses today with a web app. In the app, an HR Manager can keep salary data for about 10,000 employees in several countries accurate and up to date, and can answer questions about how the organisation pays people without exporting data to Excel.

## User and problem

**Persona:** the HR Manager. They are comfortable with spreadsheets but not technical. Their work is either looking up a person or a group, changing a record, or answering a question from leadership, such as "What do we pay engineers in India?" or "Which country has the widest pay range?"

**Pain today:** the data is spread across spreadsheets. Edits are manual and easy to get wrong. Every question needs a pivot table built by hand, and nothing validates the data.

## Scope and features (in)

1. **Employee directory.** A paginated, server-side list of all employees with search by name or email and filters for country, department, and job title. It stays fast at 10,000 rows or more.
2. **Manage employees and salaries.** Create, view, edit, and delete employee details, and record salary periods. Employee details include name, email, job title, department, country, employment type, and hire date. Each salary period has an annual salary, currency, and effective date. Validate required fields, unique email, a positive salary, and currency consistency with the employee's country when the period is created. Hire dates cannot be in the future.
3. **Salary history.** Store the initial salary and each later salary change as a separate row, and let HR review the history. A salary change adds a new period; it does not overwrite an earlier period. Salary increases and decreases are both allowed. Effective dates may be in the past or future; current salary is the latest period effective today.
4. **Salary insights.** These answer "how do we pay people":
   - Per country: headcount, total payroll, and minimum, median, average, and maximum salary.
   - Per job title within a country: the same statistics, so like-for-like roles can be compared.
   - Per department within a country: headcount and salary distribution.
   - All figures are calculated in the database from live data, never precomputed or hard-coded.
5. **Seed data.** A repeatable script creates 10,000 realistic employees across multiple countries, departments, and roles, with salaries in plausible local ranges.
6. **Quality.** The core domain logic, the API, and key UI flows have fast, deterministic unit and request tests, and CI runs lint, type checks, security scans, and tests.
7. **Deployed.** Frontend, API, and database are publicly reachable, and there is a short video demo.

## Key decisions

- **Employee details and salary periods are separate records.** `employees` stores employee details; `employee_salaries` stores one row per salary period, including salary, currency, and `effective_on`.
- **Salaries are stored in local currency, and aggregates are grouped by country or currency.** Mixing currencies in one average is meaningless. Converting them would require exchange rates and a policy for which rate and which date to use, which is a separate product decision.
- **Each salary period stores one annual base salary.** This is how HR compares pay. Bonus, equity, and allowances are excluded (see below).
- **Stack:** Rails API, PostgreSQL, React with TypeScript (Vite). PostgreSQL provides `percentile_cont` for medians and proper indexing for filtering at this scale.

## Deliberately out of scope (and why)

| Excluded | Reason |
| --- | --- |
| Authentication, roles, and permissions | There is a single persona and the data is synthetic. Adding auth properly (SSO, role-based access, audit) would take time away from the core workflows. It is the first item for a real rollout. |
| Currency conversion and a global payroll total | Needs a source of exchange rates and a policy decision about which rate to use. Per-country reporting answers the questions honestly in the meantime. |
| Bonus, equity, benefits, and allowances | Base salary covers the core "how do we pay people" questions. Total compensation multiplies the complexity. |
| Payroll processing, tax, and payslips | This is a different product, payroll rather than salary management, with legal requirements that vary by country. |
| Excel/CSV bulk import and export | Useful for migration, but the seed script covers the initial load. Import needs validation and error reporting to be done properly. |
| Org hierarchy and manager approval workflows | Not needed to manage or analyse pay, and they add workflow state. |
| Internationalisation and accessibility beyond sensible defaults | There is a single English-speaking persona. Semantic HTML and accessible components are used, but there is no formal audit. |

## Success criteria

- The HR Manager can find any employee in under 2 seconds and update their salary in a few clicks.
- Every employee has an initial salary period; salary changes add dated periods, and current salary reporting uses the latest period effective today.
- Every insight figure can be traced to a query over the current data and changes immediately after an edit.
- The seed script produces 10,000 employees, and the list and insight endpoints stay responsive at that size.
- The test suite runs green in CI on every push.
