# Performance considerations

Measured on the development database with the 10,000-employee seed (one salary period each), PostgreSQL 16, Rails in development mode on a laptop. Timings are warm requests; the first request after boot is slower.

## Insight reports

End-to-end HTTP time (`curl`, five warm requests each):

| Request | Time |
| --- | --- |
| `GET /exchange_rates/current` (cached rates) | 11–15 ms |
| `GET /insights/summary` (INR, JPY) | 52–94 ms |
| `GET /insights/department_costs` (all; country filter) | 35–102 ms |
| `GET /insights/role_salary_ranges` (all; department filter) | 50–82 ms |
| `GET /insights/country_salary_distribution` (all; job title filter) | 44–108 ms |

Each report is one SQL query (two for the summary and department costs, which add a per-currency breakdown) plus a small query for the currencies present. There is no caching of computed figures, so reports change as soon as a salary is edited.

**Current salary set.** Aggregating every employee's current salary with `DISTINCT ON (employee_id)` takes about 10 ms (`EXPLAIN ANALYZE`), against 17 ms for a `LATERAL` lookup per employee, so the reports use `DISTINCT ON`. The directory keeps `LATERAL`, which is faster for one page of 25 rows.

**Exact percentiles.** Ranking with `ROW_NUMBER()` and interpolating in `numeric` costs little at this size. The exact results agree with PostgreSQL's float-based `percentile_cont` to within the 2-decimal rounding (largest difference ₹0.0049 across the 18 roles).

**Exchange rates.** Reports never call the provider. Only `/exchange_rates/current` may refresh, at most every 6 hours (or when the in-memory cache is empty), under a per-process lock that other requests don't wait on, with 2 s connect and 3 s read timeouts.

## Regression check

`spec/performance/insights_performance_spec.rb` loads the full 10,000-employee seed into the test database and requires each insight endpoint to answer within 1 second. The limit is deliberately loose for slower CI machines; the table above records the real figures.
