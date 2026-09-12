# Repository Guidelines

## Scope and Instruction Hierarchy

- `Scope`: this file applies to the entire repository.
- `Local guides`: `frontend/AGENTS.md` and `seahub/AGENTS.md` take precedence
  for changes in their directories.
- `Change scope`: modify the smallest relevant component; do not reformat
  unrelated files.
- `Purpose`: use this guide for shared expectations and the local guides for
  technology-specific rules.

## Project Layout

- `seahub/`: Django backend; read its local guide before changing backend code.
- `frontend/`: React frontend; read its local guide before changing UI code.
- `tests/`: cross-application Python test support and test scripts.
- `thirdpart/`: shared or vendored Django applications.
- `media/`: static assets, editor resources, and translation files.
- `sql/`: database-dialect-specific SQL.

## Build, Test, and Development Commands

- `pip install -r dev-requirements.txt`: install Python development dependencies.
- `python manage.py runserver`: start the Django server after configuring a
  local Seafile deployment.
- `make dist`: compile locale and static output.
- `frontend/AGENTS.md`: find React commands and prerequisites.
- `seahub/AGENTS.md`: find Django checks and test-environment requirements.

## Commits and Pull Requests

- `Commit subject`: use a concise imperative summary, commonly with `feat:`,
  `fix:`, or `refactor:`; include an issue or PR number when available.
- `Commit scope`: keep each commit focused on one change.
- `Pull request`: describe the user-visible effect, tests run, and linked issue.
- `UI changes`: include screenshots or recordings.
- `Operational changes`: call out migration, configuration, and translation
  updates explicitly.

## Configuration and Security

- `Secrets`: never commit credentials, tokens, or local service paths.
- `Configuration`: use deployment configuration and environment variables for
  sensitive values.
- `Generated files`: review generated static output before committing it.
