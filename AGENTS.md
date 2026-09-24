# Seahub Agent Notes

## Stack and Boundaries
- Root is a Django app; `manage.py` uses `seahub.settings` and pytest uses `seahub.test_settings` via `pytest.ini`.
- Frontend lives entirely under `frontend/`; it is not a single SPA. Webpack entrypoints are declared in `frontend/config/webpack.entry.js`, and Django templates load those bundles with `render_bundle`.
- The main logged-in React shell is `frontend/src/app.js`, but many pages have their own entry files (`settings`, `wiki2`, file viewers, sysadmin, etc.). Check `webpack.entry.js` before assuming where a page starts.
- Most React pages are mounted by Django `react_fake_view` / `sysadmin_react_fake_view` and receive data through `window.app.config` and `window.app.pageOptions` from `seahub/templates/base_for_react.html`.
- OpenCode global config is `/Users/lian/.config/opencode/opencode.json`; it loads instructions in this order: `/Users/lian/.config/opencode/global-instructions.md`, `/Users/lian/.config/opencode/vendor/agent-skills/AGENTS.md`, then repo-root `CLAUDE.md` and `AGENTS.md`.
- Repo-local OpenCode config is `./opencode.json`; it enables the local `git` MCP server for `/Users/lian/dev/seafile-dev/data/dev/seahub`.
- Prefer using capabilities already configured in OpenCode before reaching for manual approaches.
- Be proactive about using matching `skill` workflows for implementation, debugging, review, planning, testing, frontend work, and documentation tasks.
- Use specialized `agent` subagents when the task benefits from deeper focused analysis, especially `explore`, `code-reviewer`, `security-auditor`, and `test-engineer`.
- Prefer configured MCP integrations when they fit the job: use the repo `git` MCP for repository inspection, `context7` for library documentation lookup, and `gh_grep` for real-world code search patterns.
- Do not ignore available `skill`, `agent`, or MCP tooling and reimplement the same workflow manually unless the built-in option is clearly not suitable.
- Before probing an MCP or LSP capability, verify the configured server and supported operation once. Do not enumerate guessed server names or repeatedly call `list_mcp_resources` / `list_mcp_resource_templates`; these calls are only for servers known to expose resources. If no LSP is configured for the target file type, report that limitation directly and use the appropriate supported search tool for references.
- If this repo adds `CLAUDE.md`, keep it at the repository root and use it only for repo-specific guidance that should layer on top of the global instructions above.

## Commands
- On the host machine, use the Python virtual environment interpreter at `/Users/lian/python3.14-venv/bin/python` for Python commands.
- Python deps: `pip install -r requirements.txt`.
- Frontend deps: run `npm install` inside `frontend/`. `frontend/package-lock.json` is gitignored here, so do not commit lockfile churn.
- Frontend lint: `cd frontend && npm run lint`
- Frontend tests: `cd frontend && CI=true npm test -- --watchAll=false`
- Frontend prod build: `cd frontend && npm run build`
- Django static/dist build: `make dist` runs `locale`, `python manage.py compilejsi18n`, and `collectstatic`.

## Frontend Build Gotchas
- Django reads only `frontend/webpack-stats.pro.json` (`seahub/settings.py`). Production builds generate that file; the dev server writes `webpack-stats.dev.json`, which Django does not reference.
- `frontend/build` is only added to `STATICFILES_DIRS` if it exists. If a UI change must be exercised through Django templates, build the frontend first instead of relying on `npm run dev` alone.
- Production webpack output goes to `frontend/build/frontend` and uses `/assets/bundles/` as the public path by default (`frontend/config/paths.js`).

## Test Reality
- Backend tests are not self-contained Django unit tests. They expect Seafile server Python packages (`seafile`, `seaserv`, `ccnet`, `pysearpc`) on `PYTHONPATH`; CI bootstraps them from other repos before running pytest.
- Seahub service runs inside the `seafile-dev` Docker container in local development. Do not run backend pytest directly on the host from the repo checkout when verification is needed.
- Use the containerized backend test command instead:
  ```bash
  docker exec seafile-dev bash -lc 'cd /data/dev/seahub && export CONF_PATH=/data/conf COMPILE_PATH=/data/compiled CCNET_CONF_DIR=/data/conf SEAFILE_CENTRAL_CONF_DIR=/data/conf SEAFILE_CONF_DIR=/data/conf/seafile-data SEAFES_DIR=/data/dev/seafes/ SEAHUB_DIR=/data/dev/seahub/ SEAHUB_LOG_DIR=/data/logs/ JWT_PRIVATE_KEY=bc187b9a-2f34-43cf-bea3-73c87e7375eb SITE_ROOT=/ SEAFILE_MYSQL_DB_CCNET_DB_NAME=ccnet SEAFILE_MYSQL_DB_SEAFILE_DB_NAME=seafile SEAFILE_MYSQL_DB_SEAHUB_DB_NAME=seahub SEAFILE_MYSQL_DB_USER=root SEAFILE_MYSQL_DB_PASSWORD=db_dev SEAFILE_MYSQL_DB_HOST=db SEAFILE_MYSQL_DB_PORT=3306 PYTHONPATH=/data/compiled:/data/conf:/usr/lib/python3.12/dist-packages:/usr/lib/python3.12/site-packages:/usr/local/lib/python3.12/dist-packages:/usr/local/lib/python3.12/site-packages:/data/dev/seahub/thirdpart:/data/dev/pyes/pyes:/data/dev/portable-python-libevent/libevent:/data/dev/seafobj:/data/dev/seahub/seahub/:/data/dev/ DJANGO_SETTINGS_MODULE=seahub.test_settings && pytest tests/seahub -q'
  ```
- If you need to run a narrower backend test target, keep the same `docker exec ... bash -lc 'cd /data/dev/seahub && export ... && pytest ...'` pattern and only replace the final pytest target.
- `tests/seahubtests.sh` is the closest thing to the CI backend flow: `init` runs `makemigrations` then `migrate --noinput`, `runserver` starts Django, and `test` runs `py.test tests`.
- On macOS, `tests/seahubtests.sh init` uses GNU-style `sed -i` against `seahub/settings.py`; that command will fail as written on BSD `sed`.
- CI only runs backend tests when changes are not limited to `frontend*`, `media*`, `static*`, or `locale*` (`tests/test_seahub_changes.sh`). Frontend CI only runs when the diff touches `frontend*` (`tests/test_frontend_changes.sh`).
- `pytest.ini` sets `DJANGO_SETTINGS_MODULE=seahub.test_settings` and `addopts = -s -v`; target a single test with plain pytest paths, for example `pytest tests/seahub/utils/test_file_size.py`.
- `ApiTestBase`-derived tests (e.g. `tests/api/test_repos.py::ReposApiTest`) go over HTTP to a live seahub (`get_auth_token` asserts `res.status_code == 200`) and therefore fail in this DB-only container setup; that is environmental, not a regression. Prefer `BaseTestCase`-derived targets when verifying locally.

### Test Database Gotchas
- **Problem:** First pytest run in this environment fails at test setup with `Table 'test_seahub.<table>' doesn't exist` (e.g. `repo_archive_status`, `webhooks`) or `Unknown column 'wiki_wiki2_publish.enable_server_render'`.
- **Cause:** pytest-django drops and recreates the `test_seahub` database on every run and only applies Django migrations. Seafile server creates and ALTERs ~165 tables of its own in the `seahub` database (e.g. `repo_archive_status`, `webhooks`, `wiki_wiki2_publish`, `activities`, dtable tables) — these tables/columns are not in any Django migration, so a freshly migrated test DB is missing them.
- **Fix (once, after first `pytest` run has built the DB):**
  1. Reset the test DB, then run any pytest target once so it recreates and migrates it:
     ```bash
     docker exec seafile-mysql mysql -uroot -pdb_dev -e "DROP DATABASE IF EXISTS test_seahub"
     # ... run pytest once (see command above), then:
     ```
  2. Copy the structure of Seafile-managed tables (tables present in `seahub` but missing in `test_seahub`):
     ```bash
     docker exec seafile-mysql bash -lc 'mysql -uroot -pdb_dev -N -e "SHOW TABLES FROM seahub" | sort > /tmp/seahub_tables.txt && mysql -uroot -pdb_dev -N -e "SHOW TABLES FROM test_seahub" | sort > /tmp/test_tables.txt && comm -23 /tmp/seahub_tables.txt /tmp/test_tables.txt > /tmp/missing_tables.txt && mysqldump -uroot -pdb_dev --no-data --skip-add-drop-table seahub $(tr "\n" " " < /tmp/missing_tables.txt) > /tmp/missing.sql && mysql -uroot -pdb_dev test_seahub < /tmp/missing.sql'
     ```
     Dump to a file first instead of piping straight into `mysql`: a foreign-key error (errno 150, e.g. `base_filecomment`) aborts the pipe mid-transfer and silently leaves tables missing.
  3. Sync columns Seafile server ALTERed in (columns in `seahub` missing in `test_seahub`), e.g. `wiki_wiki2_publish.enable_server_render`:
     ```bash
     docker exec seafile-mysql mysql -uroot -pdb_dev -e "ALTER TABLE test_seahub.wiki_wiki2_publish ADD COLUMN enable_server_render tinyint(1) NOT NULL DEFAULT 0"
     ```
- **Always run backend tests with `--reuse-db` afterwards**, otherwise pytest drops and recreates the test DB and you lose the copied tables again: append `--reuse-db` to the pytest target.
- **Do NOT** fix this by cloning the whole `seahub` schema into `test_seahub`: `seahub.django_migrations` is stale (52 rows vs 64 expected), so pytest's migrate step then fails with `Table 'abuse_reports_abusereport' already exists`.
- **The live `seahub` DB can itself lag the model definitions**, so copying from it is necessary but not sufficient. Observed 2026-09-24: `seahub.wiki_settings` was missing `icon`/`color` and `seahub.repo_metadata` was missing `tags_lang`, yet `seahub/wiki2/models.py` (`Wiki2Settings`) and `seahub/repo_metadata/models.py` (`RepoMetadata`) select those columns, so pytest fails while serializing the test DB. Add the model-expected columns to `test_seahub` explicitly, taking DDL from `sql/mysql.sql` or `scripts/upgrade/sql/<version>/mysql/seahub.sql` (e.g. `14.0.0/mysql/seahub.sql` adds `wiki_settings.icon/color`; `13.0.0/mysql/seahub.sql` adds `repo_metadata.tags_lang`):
  ```bash
  docker exec seafile-mysql mysql -uroot -pdb_dev test_seahub -e "ALTER TABLE wiki_settings ADD COLUMN icon VARCHAR(255) NULL DEFAULT NULL, ADD COLUMN color VARCHAR(255) NULL DEFAULT NULL; ALTER TABLE repo_metadata ADD COLUMN tags_lang varchar(36) NULL;"
  ```
- **Find remaining drift generically instead of guessing** by diffing columns between the two schemas; anything listed that the models select must be added to `test_seahub`:
  ```bash
  docker exec seafile-mysql bash -lc 'mysql -uroot -pdb_dev -N -e "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=\"seahub\"" | sort > /tmp/s_cols.txt && mysql -uroot -pdb_dev -N -e "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=\"test_seahub\"" | sort > /tmp/t_cols.txt && comm -23 /tmp/s_cols.txt /tmp/t_cols.txt'
  ```
- After a repair both databases should hold the same table count (268 as of 2026-09-24); re-check with `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='test_seahub'`.
- `docker exec seafile-mysql` is not covered by the pre-approved `seafile-dev` prefix, so expect to request escalation for DB inspection and repair.

## Env and Config Gotchas
- Prefer executable sources over old docs here: current code reads `SEAFILE_CENTRAL_CONF_DIR` or `SEAFILE_DATA_DIR`, while `README.markdown` / `setenv.sh.template` still mention older env naming.
- CI also exports `JWT_PRIVATE_KEY` and `REDIS_HOST`; some API and Seadoc codepaths read those directly from settings/env.

## Safe Change Scope
- Do not hand-edit generated or ignored outputs unless the task is explicitly about build artifacts: `frontend/build`, `frontend/webpack-stats.dev.json`, `media/assets`, and `static/scripts/i18n` are produced by build steps and/or ignored.

## Git MCP Preference
- In this repository, prefer the project `git` MCP for code review, diff inspection, status checks, and git history analysis before falling back to raw git shell commands.

## Library Name Uniqueness
- Creating a personal (`POST /api2/repos/`, field `name`) or group-owned/department library (`POST /api/v2.1/groups/<group_id>/group-owned-libraries/` and the admin/org-admin variants, field `name` or `repo_name`) now rejects a name that already exists, returning HTTP 400 `Library name already exists.`
- The check is centralized in `check_repo_name_conflict(request, repo_name, group_id=None)` in `seahub/utils/repo.py`; call it after argument validation and before the create RPC. It compares exact strings against the operator's owned libraries plus group-owned libraries (a personal library merely shared to a group is intentionally not counted). Renaming is not covered.
- It is a check-then-create, not an atomic guarantee; concurrent creates can still race.

### Name-Uniqueness Test Isolation
- Because duplicate names are now rejected, any test that POSTs a fixed library name and does not delete the repo will pass once and then fail with HTTP 400 on the next `--reuse-db` run. This is expected behavior surfacing a test-isolation bug, not a regression.
- Observed: `tests/api/test_repos.py::NewReposApiTest::test_create_encrypted_repo` used the fixed name `enc-test` and leaked the repo.
- Fix pattern: use a unique name (`'enc-test-' + randstring(6)`) and register cleanup right after the POST parses successfully: `self.addCleanup(self.remove_repo, repo_id)`.
