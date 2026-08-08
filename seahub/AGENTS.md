# Backend Contribution Guidelines

## Scope and Structure

- `Scope`: this guide applies to `seahub/` and supplements `../AGENTS.md`.
- `api2/`: REST API code; endpoints commonly live in `api2/endpoints/`.
- `base/`: shared backend utilities, base services, and Django integration.
- `<app>/`: the owning Django app for its models, views, templates, and business
  logic.
- `<app>/migrations/`: database migrations; never rewrite shared migration
  history—add a new migration instead.
- `<app>/tests/`: app-level tests.
- `../tests/`: cross-application tests and test scripts.
- `Change placement`: modify the closest owning app.

## Setup and Commands

- `pip install -r dev-requirements.txt`: install development dependencies.
- `python manage.py runserver`: start the backend with a configured local
  Seafile deployment.
- `./code-check.sh seahub.api2`: run Pylint error checks for a focused module.
- `./tests/seahubtests.sh test`: run the Python suite after Seafile services and
  the test environment have been initialized; use `.github/workflows/test.yml`
  as the setup reference.
- `make dist`: regenerate locale and static output when affected.

## Code Style and Naming

- `Style source`: follow nearby code and the checked-in `pylintrc`.
- `Indentation`: use four spaces.
- `Names`: use `snake_case` for modules, functions, and variables; use
  `PascalCase` for classes.
- `Business logic`: place it in the existing model, service, or utility that owns
  it instead of expanding views unnecessarily.
- `Authorization`: reuse Django validation and permission checks; never bypass
  authorization for convenience.
- `Secrets`: keep settings and sensitive values out of source control.

## Tests and Review

- `Regression coverage`: add a focused test for changed behavior, including
  success and permission/error paths where relevant.
- `Test sequence`: run the narrowest practical test first, then the full backend
  suite when the environment is available.
- `Pull request`: describe data or API behavior changes and list tests run.
- `Operational impact`: identify required migrations, configuration, and
  translation updates.
- `Compatibility`: document changes to externally consumed endpoints.
