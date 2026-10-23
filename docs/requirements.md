# Requirements: ACME Salary Management

## Goal

Replace the spreadsheets that ACME's HR team uses today with a web app. An HR Manager can keep salary data for about 10,000 employees in several countries accurate and up to date, and answer questions about how the organisation pays people without exporting data to Excel.

## User and problem

**Persona:** the HR Manager. They are comfortable with spreadsheets but not technical. Their work is looking up a person or group, changing a record, or answering a question from leadership, such as "What do we pay engineers in India?" or "Which country has the widest pay range?"

**Pain today:** the data is spread across spreadsheets. Edits are manual and easy to get wrong. Every question needs a pivot table built by hand, and nothing validates the data.

## Scope and features (in)

1. **Employee directory.** A paginated, server-side list of employees with search by name or email and filters for country, department, and job title. It stays fast at 10,000 rows or more.
2. **Manage employees and salaries.** Create, view, edit, and delete employee details: name, email, job title, department, country, employment type, and hire date. Salaries are stored separately as dated periods.
3. **Salary history.** Store an employee's initial salary and each later salary change as a separate period, and let HR review the history. A salary change adds a period rather than replacing an earlier one.
4. **Salary insights.** These answer "how do we pay people":
   - Per country: headcount, total payroll, and minimum, median, average, and maximum salary.
   - Per job title within a country: the same statistics, so like-for-like roles can be compared.
   - Per department within a country: headcount and salary distribution.
   - All figures are calculated in the database from live data, never precomputed or hard-coded.
5. **Seed data.** A repeatable script creates 10,000 realistic employees across multiple countries, departments, and roles, with salaries in plausible local ranges.
6. **Quality.** Core domain logic, the API, and key UI flows have fast, deterministic tests; CI runs lint, type checks, security scans, and tests.
7. **Deployed.** Frontend, API, and database are publicly reachable, and there is a short video demo.

## Key decisions

- **Separate employee details from salary periods.** `employees` stores employee details. `employee_salaries` stores one row per salary period, including the employee, salary, currency, and effective date.
- **Salaries are stored in local currency.** Salary statistics are grouped or scoped by country so currencies are not mixed. Conversion is a separate product decision requiring exchange-rate data and a policy for which rate and date to use.
- **Each salary period stores one annual base salary.** Bonus, equity, and allowances are excluded because total compensation would multiply the scope.
- **Stack:** Rails API, PostgreSQL, React with TypeScript (Vite). PostgreSQL provides `percentile_cont` for medians and proper indexing for filtering at this scale.

## Deliberately out of scope (and why)

| Excluded | Reason |
| --- | --- |
| Authentication, roles, and permissions | There is a single persona and the data is synthetic. Adding auth properly (SSO, role-based access, audit) would take time away from core workflows. It is the first item for a real rollout. |
| Currency conversion and a global payroll total | Needs a source of exchange rates and a policy about which rate to use. Per-country reporting answers the questions honestly in the meantime. |
| Bonus, equity, benefits, and allowances | Base salary covers the core questions. Total compensation multiplies the complexity. |
| Payroll processing, tax, and payslips | This is a different product, payroll rather than salary management, with legal requirements that vary by country. |
| Excel/CSV bulk import and export | Useful for migration, but the seed script covers the initial load. Import needs validation and error reporting to be done properly. |
| Org hierarchy and manager approval workflows | Not needed to manage or analyse pay, and they add workflow state. |
| Internationalisation and accessibility beyond sensible defaults | There is a single English-speaking persona. Semantic HTML and accessible components are used, but there is no formal audit. |

## Success criteria

- The HR Manager can find any employee in under 2 seconds and update their salary in a few clicks.
- Every employee has an initial salary period; salary changes add dated periods, and current salary uses the latest effective period.
- Every insight figure can be traced to a query over current data and changes immediately after an edit.
- The seed script produces 10,000 employees, and the list and insight endpoints stay responsive at that size.
- The test suite runs green in CI on every push.
