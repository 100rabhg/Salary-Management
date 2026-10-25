# ACME Salary: API

Rails 8 API (API-only) with PostgreSQL. It serves the employee directory, employee records and salary periods under `/api/v1`. The endpoints, error format and salary rules are documented in [`docs/architecture.md`](../docs/architecture.md#api).

## Requirements

- Ruby (version in `.ruby-version`) and Bundler
- PostgreSQL (CI uses version 17), reachable by your OS user or through `DATABASE_URL`

## Setup

```sh
bundle install
bin/rails db:prepare   # creates and migrates the development database
bin/rails db:seed      # 10,000 synthetic employees with salary history; safe to re-run
bin/rails server       # http://localhost:3000
```

Configuration comes from environment variables; see [`.env.example`](.env.example). The defaults suit local development: the business time zone is `Asia/Kolkata`, and the React dev server at `http://localhost:5173` may call the API.

## Checks

```sh
bundle exec rspec      # model and request specs (needs PostgreSQL)
bin/rubocop            # style
bin/brakeman           # static security analysis
bin/bundler-audit      # known vulnerable gems
```

CI runs all four on every push and pull request.
