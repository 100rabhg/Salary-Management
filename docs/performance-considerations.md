# Performance considerations

Measured on a freshly seeded database: 10,000 employees with salary history (35,080 salary periods, 523 of them pending), PostgreSQL 16, Rails in development mode on a laptop. Timings are warm requests; the first request after boot is slower.

## API

End-to-end HTTP time (`curl`, five warm requests each):

| Request | Time |
| --- | --- |
| `GET /exchange_rates/current` (cached rates) | 5–11 ms |
| `GET /insights/summary` (INR, JPY) | 70–111 ms |
| `GET /insights/department_costs` (all; country filter) | 65–117 ms |
| `GET /insights/role_salary_ranges` (all; department filter) | 74–130 ms |
| `GET /insights/country_salary_distribution` (all; job title filter) | 62–126 ms |
| `GET /employees` (page 1, page 400, search, salary sort) | 52–108 ms |

Each report is one SQL query (two for the summary and department costs, which add a per-currency breakdown) plus a small query for the currencies present. There is no caching of computed figures, so reports change as soon as a salary is edited.

**Current salary set.** Aggregating every employee's current salary with `DISTINCT ON (employee_id)` takes about 21 ms (`EXPLAIN ANALYZE`), against 28 ms for a `LATERAL` lookup per employee, so the reports use `DISTINCT ON`. The directory keeps `LATERAL`, which is faster for one page of 25 rows. With one period per employee the figures were 10 ms and 17 ms; adding salary history kept the same winner.

**Exact percentiles.** Ranking with `ROW_NUMBER()` and interpolating in `numeric` costs little at this size. The exact results agree with PostgreSQL's float-based `percentile_cont` to within the 2-decimal rounding (largest difference ₹0.0049 across the 18 roles).

**Exchange rates.** Reports never call the provider. Only `/exchange_rates/current` may refresh, at most every 6 hours (or when the in-memory cache is empty), under a per-process lock that other requests don't wait on, with 2 s connect and 3 s read timeouts.

**Planner statistics after bulk loads.** Once autovacuum had processed the emptied test tables, Postgres recorded them as empty. Reports run straight after inserting 10,000 employees then took 6–33 seconds, because the planner picked plans meant for empty tables. The seed now runs `ANALYZE` on both tables after inserting, which brings the same reports back to tens of milliseconds. Any future bulk import should do the same.

## Test suite

| Suite | Examples | Time |
| --- | --- | --- |
| Backend (`bundle exec rspec`) | 172 | about 12 s |
| Frontend (`npm test`) | 76 | about 9 s |

`spec/performance/insights_performance_spec.rb` loads the full seed once and requires every insight endpoint to answer within 1 second, and the dashboard headcount to cover all 10,000 employees. The limit is deliberately loose for slower CI machines; the table above records the real figures. It used to seed in each of five examples, which took about 40 s, or over 3 minutes with failures once the planner statistics went stale.
