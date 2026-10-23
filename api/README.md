# Nora API

Rails API for Nora: practices, patients, chart documents, the policy library,
and the prior authorization workflow. See `../docs/ARCHITECTURE.md` for the
model, services, routes, and the rules they enforce.

## Setup

```bash
bundle install
bin/rails db:create db:migrate db:seed
bin/rails server -p 3006
```

Copy `.env.example` to `.env`. Only `SECRET_KEY_BASE` is required locally.

## Tests

```bash
bundle exec rspec                    # SQLite
DATABASE_URL=postgres://nora:nora@localhost:5432/nora_test bundle exec rspec
bundle exec rubocop
bundle exec brakeman --no-pager; echo $?   # non-zero on any warning, as in CI
```

SimpleCov writes `coverage/index.html` and fails the run below 70% line
coverage.

## Seeds

- `db/seeds/policy_library.rb` loads payers, plans, and GLP-1 criteria in every
  environment: version 2, taken from the published policies of
  UnitedHealthcare, Aetna, Cigna and the BCBS Federal Employee Program, with a
  common baseline for any other payer. Sources and wording are in
  `evals/evidence/policies/`; payers revise these, so check the source URL on
  each template. Version 1 templates are kept so earlier requests keep their
  criteria.
- `db/seeds/synthetic_charts.rb` loads a demo practice, three staff accounts,
  and five synthetic patients, except in production.
