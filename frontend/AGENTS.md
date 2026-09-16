# Frontend Contribution Guidelines

## Scope and Structure

- `Scope`: this guide applies to `frontend/` and supplements `../AGENTS.md`.
- `src/components/`: reusable UI components and component subtrees.
- `src/pages/`: routed pages and page-level components.
- `src/hooks/`: shared React hooks.
- `src/utils/`: general-purpose utility functions.
- `src/models/`: frontend data models and state-related code.
- `src/assets/`: images, icons, and other frontend assets.
- `build/`: generated output; do not edit it directly.
- `Feature placement`: keep feature code close to its tests.

## Technical Architecture

- `Runtime`: React 18 and `react-dom` provide the browser UI runtime.
- `Build`: custom Webpack 5 and Babel build named Django-template bundles; add
  an entry only for a distinct page.
- `Routing`: `@gatsbyjs/reach-router` provides client-side navigation.
- `UI`: Reactstrap and repository components form the shared UI layer; reuse
  them before adding another component library.
- `HTTP`: Axios clients in `src/api/` call Seahub APIs and retain CSRF and
  server initialization behavior.
- `Localization`: ordinary Seahub UI strings use Django JavaScript `gettext`;
  editor integrations use `i18next`, its HTTP backend, and `react-i18next` with
  media catalog translations.
- `Technology choices`: prefer this stack; add dependencies or build entries
  only when it cannot meet the requirement.


### Dependency Rules

The following is the target direct-import policy for `frontend/src`. It applies
when adding or materially changing code; existing violations should not be
expanded and should be migrated when the affected module is touched.

| Layer | May import directly | Must not import |
| --- | --- | --- |
| `constants` | Other `constants`, external packages | Any other application layer |
| `utils` | Other `utils`, `constants` | `api`, `models`, `hooks`, `components`, `features`, `pages` |
| `models` | Other `models`, `constants`, `utils` | `api`, `hooks`, `components`, `features`, `pages` |
| `api` | Other `api`, `constants`, `utils` | `models`, `hooks`, `components`, `features`, `pages` |
| `hooks` | Other `hooks`, `api`, `models`, `constants`, `utils` | `components`, `features`, `pages` |
| `components` | Other shared `components`, `hooks`, `api`, `models`, `constants`, `utils`, `_i18n` | `features`, `pages` |
| `features` | Its own modules, another feature's public entry point when necessary, shared `components`, `hooks`, `api`, `models`, `constants`, `utils`, `_i18n` | `pages` and another feature's private modules |
| `pages` | Its own page modules, `features`, `components`, `hooks`, `api`, `models`, `constants`, `utils`, `_i18n` | Another page's private modules |
| `_i18n` | Other `_i18n`, `constants`, `utils`, and localization dependencies | UI layers such as `components`, `features`, and `pages` |

In addition to the table above:

- Dependencies are directional and direct. A transitive dependency does not
  grant permission to import a module directly.
- Do not introduce circular dependencies at either the top-level layer or the
  feature/component sub-tree level. If two layers need the same behavior,
  extract the shared contract or implementation into the lowest appropriate
  layer.
- `src/components` is a shared UI layer. A shared component must not know about
  a specific page or feature. Feature-specific UI belongs under
  `src/features/<feature>/components`; page-specific UI belongs under its page.
- `src/hooks` contains reusable, UI-agnostic React hooks. A hook that opens a
  dialog, renders a toast, or imports a feature is a UI workflow and should be
  colocated with the owning feature/component instead of being added to the
  global hooks layer.
- `src/utils` is for framework-agnostic helpers. API clients belong in
  `src/api`; UI side effects such as rendering a toast or opening a modal do
  not belong in `src/utils`.
- `src/api` is the network boundary and must not import React, DOM/UI
  components, hooks, pages, or feature internals. Data normalization that is
  specific to a feature belongs in that feature's service/model layer.
- `src/models` contains data/domain representations and must remain independent
  of React and page/component rendering.
- Same-layer imports are allowed only within the owner's boundary: component
  subtrees may compose shared components, a feature may compose its own
  submodules, and a page may compose modules in its own page directory. Do not
  import another page or another feature's private file; expose a stable
  directory entry point when cross-boundary reuse is necessary.
- Prefer public entry points such as `src/features/<feature>/index.js` over deep
  imports into another feature's implementation. Cross-feature dependencies must
  be intentional, acyclic, and based on the smallest stable public interface.
- Pages should prefer composing feature and component public APIs. Direct imports
  from `api`, `models`, or `utils` are acceptable for page-only orchestration,
  but must not bypass a feature's public boundary or duplicate feature logic.
- Tests may import implementation details for the unit under test, but test
  helpers must not become production dependencies.
- Any exception must be explicit in the change description with a reason and a
  follow-up migration plan; do not silently weaken the dependency direction.

The current repository contains legacy reverse dependencies, including shared
components importing feature internals, global hooks importing UI/feature code,
and utility/constants modules importing higher-level code. These are migration
items, not examples for new code.


### Import Path Rules

Use import paths to make module boundaries visible:

- A **same-submodule import** stays within one module boundary and must use a
  relative path such as `./file` or `../file`.
- A **cross-module import** must use the `@/` alias, even when both modules are
  under the same top-level directory. For example,
  `features/metadata -> features/tag` is cross-module and must use
  `@/features/tag/...`, not a long relative path.
- A **cross-top-level import** must use the `@/` alias, for example,
  `@/components/loading`, `@/api/seafile-api`, or `@/utils/constants`.
- `@/` resolves to `frontend/src`; do not write `@/src/...`. Bare package names
  such as `react` and `axios` remain unchanged.
- For this guide, a submodule is an independently owned unit with a focused
  responsibility, internal implementation, and (when it is consumed outside
  the unit) a public entry point. A directory by itself is not automatically a
  submodule.
- The default submodule boundaries are: `features/<feature>`, `pages/<page>`,
  and a reusable component directory such as `components/toast` when it has a
  public `index.js`. A nested directory such as
  `features/metadata/components` is an internal organization layer unless it
  exposes an intentional public API.
- Flat shared directories such as `api`, `hooks`, `utils`, `models`, and
  `constants` are treated as one shared module per top-level directory by
  default. The `components` layer is a collection of component submodules;
  each reusable component directory with an `index.js` is its own submodule,
  while root-level component files remain part of the shared component layer.
  If a flat area grows into an independently owned package, give it a directory
  and public entry point, then apply the submodule rule to it.
- Within a submodule, prefer relative imports to sibling files and its own
  private implementation. Across a submodule boundary, import the public
  entry point when one exists, for example `@/features/metadata` rather than
  `@/features/metadata/store/server-operator`.
- Do not use a long relative path to cross a top-level or submodule boundary,
  and do not mix relative and `@/` styles for the same boundary.
- Tests follow the same rule: use relative paths for files in the same
  submodule and `@/` for production modules outside it. Test-only helpers may
  use their own test submodule boundary.

Examples:

```js
// frontend/src/features/metadata/components/cell.js
import CellEditor from './cell-editor';                 // same submodule
import Toast from '@/components/toast';                // cross top-level
import { Tag } from '@/features/tag';                  // cross feature submodule
```

The import-path rule is independent of the dependency-layer rule above: using
`@/` does not make an otherwise forbidden dependency valid. Existing relative
imports that cross these boundaries are legacy migration items; new or modified
imports must follow this convention.

## Setup and Commands

- `npm install`: install frontend dependencies.
- `npm run dev`: start the local development server.
- `npm run build`: create a production bundle.
- `npm run lint`: check `src/` with ESLint.
- `npm run lint-fix`: apply safe ESLint fixes; inspect the resulting diff.

## Code Style and Naming

- `Style source`: follow `frontend/.eslintrc.json` and nearby code; avoid bulk
  formatting changes.
- `Components`: use `kebab-case` filenames and `PascalCase` exports, such as
  `file-uploader.js` for the filename and `FileUploader` for the export.
- `Hooks and helpers`: use `camelCase`, such as `useFileOperation`.
- `Implementation`: keep components focused and preserve existing import order.
- `Reuse`: prefer existing project components and styles over duplicates.
- `Visible text`: add new strings to the established i18n catalogs.

## Review

- `Reviewer rules`: a general request such as `review current branch` or
  `review current code` is sufficient; do not require the user to specify a
  reviewer type. Before reviewing frontend-related changes, the reviewer must
  read and apply `review-rules/code-reviewer.md`. When the change includes CSS,
  SCSS, Less, CSS Modules, pages, or components, the reviewer must also read
  and apply `review-rules/css-reviewer.md`.
- `Pull request`: state the affected screen and commands run; attach screenshots
  or recordings for visual changes.
- `Integration`: identify new translation keys and backend API expectations.
