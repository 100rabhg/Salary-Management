# Requirements: ACME Salary Management

## Goal

Replace the spreadsheets that ACME's HR team uses today with a web app. In the app, an HR Manager can keep salary data for about 10,000 employees in several countries accurate and up to date, and can answer questions about how the organisation pays people without exporting data to Excel.

## User and problem

**Persona:** the HR Manager. They are comfortable with spreadsheets but not technical. Their work is either looking up a person or a group, changing a record, or answering a question from leadership, such as "What do we pay engineers in India?" or "Which country has the widest pay range?"

**Pain today:** the data is spread across spreadsheets. Edits are manual and easy to get wrong. Every question needs a pivot table built by hand, and nothing validates the data.

## Scope and features (in)

1. **Employee directory.** A paginated, server-side list of all employees with search by name or email and filters for country, department, and job title. It stays fast at 10,000 rows or more.
2. **Manage employees and salaries.** Create, view, edit, and delete employee details, and record salary periods. Employee details include name, email, job title, department, country, employment type, and joining (hire) date. Each salary period has an annual salary, currency, and effective date. Validate required fields, unique email, a positive salary, whole amounts for currencies without a minor unit (JPY), and a supported currency. Joining dates cannot be in the future.
   - Creating an employee asks for the joining date once and creates their first salary period, effective on that date, in the same transaction.
   - The salary currency is independent of the employee's country. It defaults to the country's usual currency (INR for India); HR can choose any supported currency, and the app-wide default is INR. Changing an employee's country never alters, converts, cancels, or blocks any salary period.
3. **Salary history.** Store the initial salary and each later salary change as a separate row, and let HR review the history.
   - A salary change adds a new period. Increases and decreases are both allowed, and effective dates may be in the past, today, or the future, but not before the joining date. There is at most one period per employee per date.
   - Relative to today in the business time zone (Asia/Kolkata), a period is **current** (the latest one effective on or before today), **past** (any earlier one), or **pending** (effective after today). An employee has **at most one pending period**, and this holds even under concurrent requests.
   - Any period, including the initial, past, current, and pending ones, can be edited to correct a mistake. A pending period can also be cancelled until its effective date; periods that have taken effect cannot be cancelled, and an employee always keeps at least one period.
4. **Dashboard and salary insights.** These answer "how do we pay people", in one **display currency** the user picks from the six supported currencies (default INR):
   - **Dashboard** (the home page): headcount, estimated monthly cost and estimated annual cost, with an optional breakdown by original salary currency.
   - **Insights**, three reports, each with its own filters. A report never filters on the dimension it groups by.
     1. *Monthly cost by department* (filters: country, employment type).
     2. *Annual salary range by role*: minimum, 25th percentile, median, 75th percentile, maximum and mean per job title (filters: country, department, employment type).
     3. *Annual salary distribution by country*: the same statistics for every country side by side (filters: department, job title, employment type).
   - **Definitions.** Each employee's *current salary* is their latest salary period effective on or before today. *Headcount* counts every matching employee; employees with no salary in effect yet are shown separately and left out of salary figures. *Monthly cost* is the sum of current annual base salaries divided by 12 (all employment types, no bonus or employer costs). Salary ranges are always annual; costs are always monthly.
   - **Conversion.** Each salary is converted to the display currency *before* figures are combined, using dated ECB reference rates. Converted figures are labelled as estimates and show their rate date and source. Stored salaries are never converted or changed.
   - All figures are calculated in the database from live data, never precomputed or hard-coded. Percentiles are calculated exactly.
5. **Seed data.** A repeatable script creates 10,000 realistic employees across multiple countries, departments, and roles, with salaries in plausible local ranges.
6. **Quality.** The core domain logic, the API, and key UI flows have fast, deterministic unit and request tests, and CI runs lint, type checks, security scans, and tests.
7. **Deployed.** Frontend, API, and database are publicly reachable, and there is a short video demo.

## Key decisions

- **Employee details and salary periods are separate records.** `employees` stores employee details; `employee_salaries` stores one row per salary period, including salary, currency, and `effective_on`.
- **Salaries are stored in their original currency and never converted.** Each salary period carries its own currency, which usually but not always matches the employee's country. Reports convert at read time into the chosen display currency using the latest ECB reference rates (fetched from Frankfurter and kept as one dated rate set in the API's in-memory cache), and label the results as estimates. Every salary is converted before figures are combined, so no statistic mixes currencies. All reports on one page use the same rate set.
- **"Today" is a business date in one time zone, Asia/Kolkata** (configurable). It decides whether a period is past, current, or pending, so the API, the database queries, and the UI all use the same date.
- **Each salary period stores one annual base salary.** This is how HR compares pay. Bonus, equity, and allowances are excluded (see below).
- **Stack:** Rails API, PostgreSQL, React with TypeScript (Vite). PostgreSQL provides exact `numeric` arithmetic for converted figures and percentiles, and proper indexing for filtering at this scale.

## Deliberately out of scope (and why)

| Excluded | Reason |
| --- | --- |
| Authentication, roles, and permissions | There is a single persona and the data is synthetic. Adding auth properly (SSO, role-based access, audit) would take time away from the core workflows. It is the first item for a real rollout. The UI shows a fixed demo HR profile in the header instead. |
| Audit log of salary corrections and cancellations | Corrections overwrite a period and a cancelled pending period is deleted, so the app keeps no record of who changed what. A real rollout needs this alongside authentication. |
| Converting stored salaries, rates as of each salary's date, and live or intraday rates | Reports only need today's estimate in one display currency. Stored salaries stay in their original currency; historical or live rates would need a rate policy and a paid data source. |
| Salary movements over a date range, and the impact of upcoming salary changes | The reports describe current pay. Trends and scheduled-change forecasting are separate features. |
| Bonus, equity, benefits, and allowances | Base salary covers the core "how do we pay people" questions. Total compensation multiplies the complexity. |
| Payroll processing, tax, and payslips | This is a different product, payroll rather than salary management, with legal requirements that vary by country. |
| Excel/CSV bulk import and export | Useful for migration, but the seed script covers the initial load. Import needs validation and error reporting to be done properly. |
| Org hierarchy and manager approval workflows | Not needed to manage or analyse pay, and they add workflow state. |
| Internationalisation and accessibility beyond sensible defaults | There is a single English-speaking persona. Semantic HTML and accessible components are used, but there is no formal audit. |

## Success criteria

- The HR Manager can find any employee in under 2 seconds and update their salary in a few clicks.
- Every employee has an initial salary period, effective on their joining date; salary changes add dated periods, and current salary reporting uses the latest period effective today.
- No employee ever has more than one pending salary period, even when two HR users save at the same moment.
- Every insight figure can be traced to a query over the current data and changes immediately after an edit.
- Every converted figure shows its rate date and source, every report on a page uses the same rate set, and reports keep working from the last cached rates when the rate provider is unavailable.
- The seed script produces 10,000 employees, and the list and insight endpoints stay responsive at that size.
- The test suite runs green in CI on every push.
