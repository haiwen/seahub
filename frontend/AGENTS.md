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
- `HTTP`: Axios clients in `src/utils/*-api.js` call Seahub APIs and retain CSRF
  and server initialization behavior.
- `Localization`: `i18next`, its HTTP backend, and `react-i18next` load media
  catalog translations.
- `Technology choices`: prefer this stack; add dependencies or build entries
  only when it cannot meet the requirement.

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
