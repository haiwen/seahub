# AI Chat SDoc Format Alignment Design

## Status

- Date: 2026-09-18
- Status: Revised after review; pending protocol details
- Scope: Seahub AI Chat SDoc creation
- Related repositories:
  - `../seadoc-specification`
  - `../sdoc-server`

## Context

AI Chat currently accepts a small, Seahub-specific block format and converts it
to SDoc v4 in `seahub/ai/utils.py`. The format supports headings, paragraphs,
blockquotes, code blocks, ordered and unordered lists, task lists, dividers, and
tables.

This is a useful plain-text subset, but it is not a complete representation of
the types documented by `seadoc-specification`. The current contract is also
implicit: accepted fields are defined by branches and exact key comparisons in
the converter rather than by a versioned schema.

The implementation has two known structural mismatches:

- A multi-line code block is emitted as one `code_line` containing newline
  characters. The specification defines each `code_line` as one line.
- New table cells contain empty `style` and `inherit_style` objects rather than
  the defaults used by the specification and current editor model.

The existing tests in `tests/seahub/ai/test_sdoc_utils.py` cover only a small
part of the conversion logic. They do not exercise the Chat API, SSE result
processing, real Seafile file creation, persisted file read-back, or cleanup.

## Goals

1. Support the explicitly listed self-contained content element types plus
   `link` and `embed_link`. Repository-backed and specialized media elements
   are deferred.
2. Generate SDoc v4 structures that follow the documented nesting, required
   fields, void placeholders, and editor-created defaults.
3. Support rich-text marks and valid inline content rather than treating every
   value as one plain-text leaf.
4. Introduce a versioned and testable contract between Seafile AI and Seahub.
5. Add a local E2E agent that calls real Seahub, Seafile AI, LLM, and Seafile
   services to create, read back, verify, and delete documents without manual
   Chat UI interaction.

## Non-Goals

- Supporting historical or implementation-private element types not formally
  listed by the current specification.
- Letting the model emit final SDoc JSON without server-side compilation.
- Supporting repository-backed `image`, `image_block`, `video`, `file_link`,
  `sdoc_link`, or `whiteboard` elements in this phase.
- Running the cross-service E2E test in online CI.
- Replacing the SDoc editor's runtime normalization or validation.
- Defining undocumented child grammars more broadly than needed by AI Chat.
- Adding persistent idempotency for repeated AI final results. Duplicate
  processing remains a separate hardening task.
- Adding concurrent-create protection, immutable generated-file history, or an
  uncertain-RPC recovery transaction.

## Specification Boundary

The implementation targets `format_version: 4` and the following explicitly
listed content types in the current `seadoc-specification` main branch:

- `blockquote`
- `callout`
- `check_list_item`
- `code_block`
- `divider`
- `embed_link`
- `formula`
- `header1` through `header6`
- `link`
- `multi_column`
- `ordered_list`
- `paragraph`
- `subtitle`
- `table`
- `title`
- `unordered_list`

The following repository-backed or specialized media types are explicitly
deferred until their resource lifecycle, authorization, and sidecar storage
behavior are designed:

- `image`
- `image_block`
- `video`
- `file_link`
- `sdoc_link`
- `whiteboard`

Structural types such as `code_line`, `list_item`, `table_row`, `table_cell`,
and `column` are compiler output. The AI-facing protocol must not accept them
as arbitrary top-level content.

The specification explicitly says its list is not a complete inventory of all
elements accepted by every existing SeaDoc implementation. This project uses
the published list as its boundary and does not infer support for undocumented
types.

## Considered Approaches

### Extend the existing flat block protocol

This would add more branches to `build_sdoc_content()` and new fields to the
current `blocks` objects.

It has the smallest initial diff but does not model inline content, nested
containers, multi-column layouts, or trusted resources cleanly. It would become
a second incomplete SDoc schema and is not recommended.

### Accept native SDoc elements from the model

This is close to the persisted format, but it exposes internal structural
nodes, IDs, style defaults, and repository resource fields to the model. It
also makes authorization and structural validation unnecessarily difficult.
This approach is not recommended.

### Compile a versioned semantic AST

The model returns content semantics. Seahub validates the semantic AST,
supplies IDs and defaults, and compiles it to SDoc v4. This keeps the external
contract stable while allowing the persisted SDoc format to evolve. This is
the selected approach.

In-scope semantic element names match the specification directly, including
`header1` through `header6` and `check_list_item`. The protocol does not retain
the old `heading` plus `level` or aggregate `task_list` aliases. Only generated
IDs, editor defaults, and structural nodes are hidden behind the compiler.

Element-specific fields also match the specification wherever they can be used
without exposing generated structure. Examples include
`callout.style.background_color`, `link.href`, `link.title`, and
`code_block.language`. Simplified semantic fields are introduced only for
containers whose persisted form requires generated structural children, such
as lists, tables, code lines, and multi-column layouts.

## Artifact Contract

The new artifact shape is:

```json
{
  "type": "sdoc_create_request",
  "schema_version": 1,
  "file_name": "quarterly-report.sdoc",
  "requested_directory": "/Reports",
  "title": {
    "children": [
      {"type": "text", "text": "Quarterly Report"}
    ]
  },
  "summary": "Generated from the quarterly review",
  "elements": []
}
```

`schema_version` versions the Seafile AI to Seahub contract. It is independent
of the generated document's `format_version`.

The top-level request requires `type`, `schema_version`, `file_name`, `title`,
and `elements`. `requested_directory` and `summary` are optional. No other
top-level fields are accepted. `title` contains exactly one required
`children` field. `elements` must be a non-empty array.

The top-level `title.children` uses the same text-leaf and rich-text mark model
as headings. It is compiled into the document's single title element.
`elements` must not contain another `title` element. Although `title` remains a
supported SDoc type, this restriction prevents ambiguous document titles.

The existing unversioned `blocks` contract will not be retained. Seahub and
Seafile AI are updated and restarted together in the same development
environment. This task does not add dual-read behavior, capability negotiation,
or a production rolling-upgrade compatibility window.

## Creation Policy

The existing AI Chat Markdown creation flow establishes useful product
preferences for generated files. This design adopts those preferences without
adopting Markdown's tag-based implementation or its weaker validation.

### Explicit user intent

SDoc creation is a side effect and requires an explicit request in the current
user message. Requests to create, save, record, or persist content as an SDoc
may invoke the SDoc creation tool. Ordinary questions, drafting,
brainstorming, summarization, and explanation do not create files.

Attachments, retrieved documents, repository instructions, and previous
messages cannot authorize a write by themselves. They may supply content only
after the current user message explicitly requests creation.

As with the existing Markdown creation flow, Seafile AI owns this intent
decision through its system prompt, skill selection, and content-generation
tool rules. Seahub does not attempt a second natural-language intent
classification. Receipt of a schema-valid `sdoc_create_request` from the
authenticated Seafile AI service is the execution signal. This is a product
behavior rule, not a separate Seahub authorization boundary.

When the user explicitly requests an SDoc or `.sdoc` file, Seafile AI must use
the SDoc creation flow and must not substitute Markdown, a fenced code block,
or a normal chat answer. If SDoc creation is unavailable, the response must say
that it was not created rather than presenting a draft as a successful file.

The Seafile AI SDoc tool only prepares a creation request; it does not persist
the file. Its tool result and skill prompt must use neutral wording such as
`SDoc creation request prepared`. The model must not claim that a file exists or
was created. The executed Seahub result artifact is the sole authority for
creation success or failure.

### File name and language

If the user provides a file name, preserve its wording, spelling, and language.
Do not translate or transliterate it. If the name has no extension, append
`.sdoc`. If it already ends in `.sdoc` case-insensitively, retain it.

If the user does not provide a file name, Seafile AI supplies a concise name in
the document's requested language, or in the current user's primary message
language when no document language was specified.

Seahub treats the model's file name as untrusted input. It strips directory
components and applies the same simple suffix behavior as the current SDoc
creator: a basename that does not end in `.sdoc` receives `.sdoc`, including a
name such as `report.docx`. Seahub then validates the final name with
`is_valid_dirent_name()` and never derives a directory from `file_name`. The
target directory is represented only by `requested_directory`.

### Target directory

AI-generated documents have the stable default directory
`/AI Generated/`, matching the existing Markdown creation policy.

- A valid, writable explicit `requested_directory` is used as requested.
- An omitted `requested_directory` selects `/AI Generated/`.
- When `/AI Generated/` does not exist, Seahub checks `can_create` on its parent
  `/`, creates the directory, accepts an already-created directory from a
  concurrent mkdir, confirms that the path is a directory, and then checks
  `can_create` on `/AI Generated/` before creating the file.
- An explicit directory that is invalid, missing, or not writable causes the
  artifact to fail. It does not fall back to the repository root or another
  directory.
- Failure to create or write the default directory also causes the artifact to
  fail.

Permission is checked against the final target directory using
`parse_repo_perm(permission).can_create`. A coarse repository-root
`can_upload` check is not sufficient.

### Conflict behavior

Keep the existing SDoc creation policy rather than Markdown's overwrite policy.
Creating an SDoc does not overwrite an existing file. Seahub selects an
available name such as `report (1).sdoc` before writing and returns that actual
name and path in the result artifact. This task does not add atomic unique-name
allocation for concurrent creates or immutable artifact history.

### Execution boundary

File creation occurs only while processing the final SSE `results` event, after
the complete semantic artifact is available and validated. Streaming answer
fragments never cause file writes.

The Seafile AI protocol emits one final `results` event followed by `[DONE]`, as
it does for Markdown creation. Seahub processes that final result once in the
normal stream path. This task does not add a separate duplicate-results state
machine or cross-request replay protection.

Seafile AI must preserve the structured creation artifact through its final
response. Seahub replaces each creation request with a structured
`created`/`failed` result and persists that executed result in Chat history.
Only a `created` result containing the real path and document UUID represents a
successful file creation.

The executed result contract is:

```json
{
  "type": "sdoc",
  "schema_version": 1,
  "status": "created",
  "name": "quarterly-report.sdoc",
  "path": "/AI Generated/quarterly-report.sdoc",
  "repo_id": "repo-id",
  "doc_uuid": "document-uuid",
  "url": "https://seafile.example/lib/repo-id/file/AI%20Generated/quarterly-report.sdoc",
  "title": "Quarterly Report",
  "summary": "Generated from the quarterly review"
}
```

`name`, `path`, `repo_id`, `doc_uuid`, and `url` are required for `created`.
`path` is an absolute repository path beginning with `/`. `title` is the plain
text concatenation of the title leaves for display. `summary` is optional.

A failed result is:

```json
{
  "type": "sdoc",
  "schema_version": 1,
  "status": "failed",
  "name": "quarterly-report.sdoc",
  "error_code": "directory_not_found"
}
```

`error_code` is required for `failed`; `name` is included when a valid final
name was available. Business failures remain inside the final HTTP 200 SSE
result, matching the existing Chat artifact behavior. Transport, authentication,
and Chat request failures continue to use their existing HTTP/SSE error paths.
`url` is a Seahub-relative path beginning with `/`, not an absolute URL with an
origin.

### Validation preference

Prompt and tool descriptions guide the model, but they are not a security or
data-integrity boundary. Seahub always applies semantic AST validation,
generated SDoc validation, file-name validation, target-directory permission
checks, and content limits before writing.

The design does not copy the Markdown implementation's pseudo-XML protocol,
root-level permission approximation, or natural-language-only failure
reporting. It does retain Markdown's prompt-driven intent and naming behavior,
simple suffix handling, and default generated-file directory. It intentionally
keeps SDoc's automatic rename behavior instead of Markdown's same-name
replacement policy.

## Semantic AST

### Text leaves

A text leaf has the following semantic shape:

```json
{
  "type": "text",
  "text": "Important",
  "bold": true,
  "color": "#d73a49"
}
```

Supported optional marks match the specification:

- Boolean: `bold`, `italic`, `underline`, `strikethrough`, `superscript`,
  `subscript`, `code`
- String: `color`, `highlight_color`, `font`
- Number: `font_size`

IDs are never accepted from the model. Seahub creates a unique ID for every
element and text leaf.

### Inline elements

Text containers accept text leaves and supported inline elements. The supported
inline element in this phase is `link`.

The compiler enforces the child grammar for each parent. A link contains one or
more display text leaves and at least one valid target.

### Block and container elements

Blocks use semantic children rather than persisted structural nodes. Examples:

```json
{
  "type": "ordered_list",
  "items": [
    {"children": [{"type": "text", "text": "First"}]},
    {"children": [{"type": "text", "text": "Second"}]}
  ]
}
```

```json
{
  "type": "table",
  "rows": [
    {
      "cells": [
        {"children": [{"type": "text", "text": "Name"}]},
        {"children": [{"type": "text", "text": "Owner"}]}
      ]
    }
  ]
}
```

The compiler generates `list_item`, `paragraph`, `table_row`, `table_cell`,
and other structural nodes. This avoids exposing implementation details to the
model.

### V1 element contract

The V1 contract is closed: unknown fields are rejected unless a type explicitly
allows them. Required fields cannot be `null`. Optional fields are omitted when
unused rather than set to `null`.

An `inline_children` value is a non-empty array containing text leaves and
`link` elements. A `text_only_children` value is a non-empty array of text
leaves. The concatenated visible text of `title`, headings, subtitle,
paragraph, blockquote, checklist item, list item, and link display content must
not be blank.

| Semantic type | Required fields | Optional fields | V1 child/content rule |
| --- | --- | --- | --- |
| `text` | `type`, `text` | Supported rich-text marks | Leaf; no `children` or `id` |
| `title` | Supplied by top-level `title.children` | None | `text_only_children`; not allowed in `elements` |
| `paragraph` | `type`, `children` | None | `inline_children` |
| `header1` through `header6` | `type`, `children` | None | `text_only_children` |
| `subtitle` | `type`, `children` | None | `text_only_children` |
| `blockquote` | `type`, `children` | None | `inline_children`; compiler creates one paragraph child |
| `callout` | `type`, `children` | `style.background_color` | One or more `paragraph` elements only; default color `#fef7e0` |
| `check_list_item` | `type`, `checked`, `children` | None | `checked` is Boolean; `inline_children` |
| `code_block` | `type`, `language`, `text` | None | `language` is a string; compiler splits `text` on `\n` into `code_line` children |
| `ordered_list` | `type`, `items` | None | Non-empty items; each item has only non-empty `inline_children` |
| `unordered_list` | `type`, `items` | None | Same as `ordered_list` |
| `divider` | `type` | None | Compiler creates the empty placeholder leaf |
| `formula` | `type`, `data.formula` | None | `data.formula` is a non-empty string; compiler creates the empty placeholder leaf |
| `link` | `type`, `href`, `title`, `children` | None | Inline only; non-empty HTTPS/HTTP `href`; `text_only_children` |
| `embed_link` | `type`, `link`, `link_type` | `data.height` | Block void; HTTPS URL; `link_type` is `seatable` or `figma`; optional integer height is 200-1200 |
| `table` | `type`, `rows` | None | Non-empty rectangular rows; each cell has only non-empty `inline_children` |
| `multi_column` | `type`, `columns` | None | Two to four semantic column objects; compiler generates equal-width layout |

Rich-text mark values use the types documented by the specification. Color
fields accept CSS hex colors in V1. A text leaf may not set both `superscript`
and `subscript` to true.

Container helper objects are also closed:

- A list item contains exactly one required `children` field.
- A table row contains exactly one required `cells` field.
- A table cell contains exactly one required `children` field.
- Formula `data` contains exactly one required non-empty `formula` field.
- Unknown fields in these helper objects are rejected.

For optional nested objects, the object and its only supported child field are
provided together:

- A callout may omit `style`; the compiler then uses the default background.
  If `style` is present, it must contain exactly one non-empty
  `background_color` field. An empty `style`, `null`, or additional style fields
  are invalid.
- An embed link may omit `data`. If `data` is present, it must contain exactly
  one valid `height` field. An empty `data`, `null`, or additional data fields
  are invalid.

Each semantic multi-column column has this exact shape:

```json
{
  "children": [
    {
      "type": "paragraph",
      "children": [
        {"type": "text", "text": "Column content"}
      ]
    }
  ]
}
```

`children` is required and non-empty. A semantic column has no `id`, `type`,
`key`, `width`, `left`, or other optional fields.

The allowed block children inside each semantic multi-column column are:

- `paragraph`
- `header1` through `header6`
- `subtitle`
- `blockquote`
- `check_list_item`
- `code_block`
- `ordered_list`
- `unordered_list`
- `divider`
- `formula`

Nested `multi_column`, `table`, `callout`, and `embed_link` elements are not
allowed in columns in V1. This deliberately defines a narrower, testable child
grammar than every structure an editor implementation might accept.

The compiler uses `text.split('\n')` for code blocks so trailing and empty lines
are preserved. It sets `style.white_space` to `nowrap`; the model cannot provide
that derived style.

The compiler creates all table structural nodes and editor defaults. The model
does not provide `columns`, grid CSS, row style, cell style, or
`inherit_style`. A heading-like first row is represented with rich-text marks,
not with a separate header-row concept that does not exist in the
specification.

V1 table output uses an AI canonical layout with these fixed values for a table
with `N` columns. These values are deterministic compiler output, not a claim
that the editor uses a fixed width at runtime:

- Each `columns` item is `{ "width": 336 }`.
- `ui` is `{ "alternate_highlight": false }`.
- `style.gridTemplateColumns` is `repeat(N, 336px)`.
- `style.gridAutoRows` is `minmax(42px, auto)`.
- Each row has `style.min_height` equal to `42`.
- Each cell style is `{ "text_align": "left", "align_items": "center",
  "background_color": "" }`.
- Each cell inherited style is `{ "text_align": "left",
  "background_color": "" }`.

The compiler creates multi-column IDs, metadata keys, widths, offsets, and grid
CSS. The model supplies only each column's block content. Columns are equal
width in V1.

V1 multi-column output uses an AI canonical fixed width of `300` for each
column. The editor may calculate widths from its runtime page size when users
create a layout interactively. For column index `i` starting at zero:

- The generated child `column.id` is also its metadata `key`.
- Metadata and child `width` are both `300`.
- Metadata `left` is `i * 300`.
- `style.gridTemplateColumns` is `repeat(N, 300px)`.

## URL References

Ordinary links and supported embeds may carry public URLs. Validation restricts
schemes and element-specific fields. At minimum, `javascript:`, `data:`, and
local file schemes are rejected. Embed `link_type` values are restricted to
values documented by the specification.

Repository identities, file paths, document UUIDs, and signed download URLs are
not accepted because repository-backed element types are outside this phase.

### Search citations

The SDoc semantic AST must not contain internal `<reference_N>` citation tokens.
They are meaningful only in the Chat answer pipeline and would otherwise be
stored as literal text in the document. When an SDoc is generated from search
results, the Chat answer may keep its normal citations. The generated SDoc may
include a plain-text `Sources` section, but V1 does not promise clickable
repository citations because repository-backed link types are deferred.

## Compilation Rules

The compiler produces this envelope:

```json
{
  "version": 0,
  "format_version": 4,
  "last_modify_user": "user@example.com",
  "elements": []
}
```

The initial revision value remains `0` unless the SDoc persistence contract
requires a different initial value. The specification defines `version` as a
revision number but does not require the example value `1`.

Important generation rules are:

- Generate a non-empty, globally unique ID for every element and text leaf.
- Preserve the semantic `header1` through `header6` types directly.
- Nest blockquote content under the documented paragraph structure.
- Split code text on newline boundaries so each logical line becomes one
  `code_line`; preserve empty and trailing lines.
- Add `style.white_space: "nowrap"` to newly generated code blocks. The
  semantic input does not control this derived style in V1.
- Compile ordered and unordered items through `list_item` and `paragraph`.
- Compile each checklist item as a `check_list_item` with an explicit Boolean
  `checked` value.
- Give each supported void element its documented placeholder text child.
- Generate table columns, rows, cells, layout fields, and current default cell
  styles. Table cells accept supported inline content rather than only strings.
- Generate multi-column metadata and matching `column` children internally.
- Preserve the existing terminal empty paragraph as a Seahub document creation
  convention, not as a general specification requirement.

## Validation

### Semantic validation

Validation occurs before compilation. It checks:

- Exact artifact fields and supported `schema_version`.
- Element-specific required and optional fields.
- Allowed inline and block child relationships.
- Maximum tree depth.
- Maximum total element count, including nested semantic nodes.
- Maximum total text length.
- Table row and column limits.
- Multi-column limits.
- URL schemes and embed types.
- Maximum SDoc creation artifacts per AI reply.

The existing input block count is insufficient once content can be nested.
Limits must count the whole semantic tree.

### Generated SDoc validation

Before writing the temporary file, validate:

- Required envelope fields and `format_version`.
- Unique, non-empty IDs across all elements and text leaves.
- Element and text-leaf shapes.
- Valid block, inline, and structural hierarchy.
- Required defaults and void placeholders.
- No unknown generated element type.
- Serialized JSON size remains within the configured limit.

The generated validator is intentionally narrower than a complete editor
validator. It validates only structures this compiler emits.

## Module Design

The current implementation should be split minimally under the owning AI app:

```text
seahub/ai/sdoc/
    schema.py
    compiler.py
    service.py
    validator.py
```

Responsibilities:

- `schema.py`: protocol version, semantic type definitions, allowed fields,
  limits, and semantic validation.
- `compiler.py`: semantic AST to SDoc v4 generation, including IDs, structural
  nodes, and defaults.
- `service.py`: target-directory selection and creation, permission checks,
  automatic conflict renaming, file persistence, UUID mapping, and result artifact
  construction.
- `validator.py`: validation of compiler output before persistence.

These modules should use a small number of functions grouped by inline, block,
and container behavior. A class or file per element type is not necessary.

`seahub/ai/utils.py` remains responsible only for:

- Recognizing SDoc creation artifacts in the AI result.
- Calling the schema, compiler, and validator layers.
- Passing each validated creation request to the SDoc service.

## Error Handling

Protocol and generation failures should return stable error codes without
leaking internal paths or exception messages. Existing broad error codes may
be retained where appropriate, but logs should distinguish:

- Unsupported protocol version.
- Invalid semantic element.
- Invalid hierarchy.
- Invalid file name.
- Requested directory not found or invalid.
- Target or default directory permission denied.
- Generated SDoc validation failure.
- Content or serialized size limit.
- File write failure.

The V1 `error_code` values are:

- `sdoc_not_enabled`
- `unsupported_schema_version`
- `unsupported_element_type`
- `invalid_artifact`
- `invalid_hierarchy`
- `generated_sdoc_invalid`
- `invalid_file_name`
- `invalid_directory`
- `directory_not_found`
- `permission_denied`
- `default_directory_unavailable`
- `content_too_large`
- `write_failed`
- `create_failed`

The create operation is atomic at the document level: one invalid element
prevents the file from being written.

SDoc persistence keeps the existing SDoc lifecycle: select an available file
name, write the file, then get or create its `FileUUIDMap`, then return the file
link. Ordinary errors produce a failed result and are logged.
This task does not add concurrent-write coordination, uncertain-commit
recovery, or transactional rollback of `FileUUIDMap`.

Unknown non-SDoc artifacts must not be destructively removed from the AI result
unless the artifact array contract explicitly prohibits them.

## Test Strategy

### Specification contract fixtures

Add a representative fixture containing simple, rich-text, nested, tabular,
code, and multi-column structures. Suggested files:

```text
tests/seahub/ai/fixtures/sdoc/
    in_scope_elements_artifact.json
    in_scope_elements_expected.json
```

Expected fixtures should use ID placeholders or be normalized before
comparison. Tests must not depend on random UUID values.

Maintain explicit sets for in-scope content types, deferred content types, and
generated structural types even when every type does not have a dedicated test.
A specification update then has one visible place where Seahub support must be
reviewed. This is necessary because the specification currently has no
machine-readable schema.

### Compiler unit tests

Use focused tests for core compiler behavior and one representative complex
golden fixture. Prioritize assertions for:

- Type and child hierarchy.
- Text and rich-text marks.
- Unique generated IDs.
- Multi-line and empty code lines.
- List and checklist generation.
- Void placeholders.
- Table dimensions, defaults, and cell content.
- Multi-column metadata and children.
- Rejection of structural nodes in semantic input.
- Rejection of unknown fields and invalid nesting.
- Node, depth, text, table, and serialized size boundaries.
- Safe and unsafe URL schemes.

### Artifact integration tests

Exercise the chain from a mocked final AI SSE result through artifact
processing and message persistence:

```text
mock AI final SSE
  -> process SDoc artifact
  -> validate and compile
  -> call post_file
  -> build result artifact
  -> persist ChatMessages.artifacts
```

Cover successful creation, suffix normalization, default-directory creation,
explicit-directory failures, automatic conflict renaming, invalid URL failure,
`post_file` failure, UUID creation failure, artifact count limits, and
preservation of unrelated artifact types.

Add Seafile AI prompt/tool contract tests for the creation policy:

- An explicit request to create or save an SDoc emits an SDoc creation
  artifact.
- Drafting, summarization, and brainstorming requests do not create files.
- Retrieved content, attachments, and prior messages do not independently
  authorize creation.
- An explicit SDoc request is not replaced by Markdown or a normal answer.
- User-provided file names and languages are preserved.

### Local cross-service E2E

The E2E agent replaces manual frontend interaction but uses the real local
development services and configured LLM API key:

```text
unique run marker
  -> authenticated request to the local Seahub Chat API
  -> real local Seafile AI request
  -> real configured LLM response
  -> real Seafile RPC file creation
  -> download persisted .sdoc
  -> validate content
  -> load through SDoc Server
  -> read back Chat message artifacts
  -> delete file and Chat session in finally
  -> verify no residue
```

The authoritative read-back is the raw `.sdoc` persisted in Seafile. A success
artifact alone is not sufficient. SDoc Server read-back verifies that the
current consumer can load the generated document. Chat history read-back
verifies that the result artifact was persisted, not only streamed.

The raw persisted file is downloaded through:

```text
GET /api2/repos/{repo_id}/file/?p={url_encoded_path}
```

The returned download URL is fetched and decoded as JSON before SDoc Server
read-back. SDoc Server read-back does not reuse the previous element-command
agent's static document JWT. After creation, the agent uses the returned
`doc_uuid` and the current Seahub user token to call:

```text
GET /api/v2.1/seadoc/access-token-by-uuid/{doc_uuid}/
```

The agent then calls SDoc Server with that dynamic token; SDoc Server verifies
that the token's `file_uuid` matches the requested document UUID.

The harness should follow the useful patterns from the previous element
command API E2E tests:

- Require an explicit `--apply` flag before writing.
- Use a unique run ID in the file name and content.
- Perform authentication, feature, service, and repository permission checks
  before modifying data.
- Create and record the Chat session before starting the streaming request.
- Fully consume the SSE stream through its terminal event and reject premature
  EOF or malformed final results.
- Record the exact created path and document UUID as soon as they are known.
- Read back authoritative state and make content-level assertions.
- Run cleanup after success and failure.
- Verify cleanup rather than assuming delete succeeded.
- Emit a redacted JSON or Markdown report with the request summary, artifact,
  persisted content checks, and cleanup result.

Suggested entry point:

```text
tests/integration/ai_chat_sdoc_creation_e2e.py
```

The agent uses the same authentication model as the previous element-command
agent: a real test user token for the local Seahub API and the service
credentials already configured in the running development environment. It does
not patch the Seahub process or replace Seafile AI. The script sends the same
HTTP requests the frontend would send, then consumes the returned SSE stream.

Suggested invocation:

```bash
python3 tests/integration/ai_chat_sdoc_creation_e2e.py \
  --repo-id <dedicated-test-repo-id> \
  --apply
```

This test is documented for local execution and is not added to online CI.
Because it uses a live LLM, it is a local system verification agent rather than
a deterministic regression test. The suite sends multiple focused Chat
requests automatically instead of requiring one response to contain every
element type. Prompts require explicit marker text and requested element kinds,
while assertions verify generated SDoc structure, marker presence, and key
semantic content instead of exact prose. Compiler and protocol edge cases
remain covered by deterministic unit and integration tests.

### E2E scenarios

The initial local suite focuses on the core user-visible flow rather than every
validation branch:

1. Explicit creation request: create an SDoc through Chat, fully consume SSE,
   verify the structured result and persisted Chat history, download the raw
   file, and load it through SDoc Server.
2. Representative complex document: request a document containing headings,
   multiple rich-text marks, inline links, nested blockquote/callout paragraphs,
   check-list items, ordered and unordered lists, multi-line code, a formula, a
   table with rich cell content, and a multi-column layout. The test must find
   at least one rich-text mark, one inline link, one blockquote or callout, one
   ordered or unordered list, one code block with at least two `code_line`
   children, one table with at least two rows and two columns, and one
   multi-column element with at least two columns. Other requested types are
   recorded as coverage but are not individually required for the run to pass.
3. Generated-file policy: verify default `/AI Generated/`, explicit target
   directory, `.sdoc` suffix handling, and automatic conflict renaming.
4. Cleanup: delete the actual returned file path before deleting the recorded
   Chat session, then verify that neither remains.

Validation boundaries and ordinary failure codes are covered by deterministic
unit and integration tests. The live-model suite is not required to induce
invalid nesting, unsafe URLs, oversized content, duplicate final results, RPC
faults, or permission failures.

## Implementation Plan

### Phase 1: Contract and fixtures

1. Define the exact `schema_version: 1` semantic JSON contract.
2. Document each in-scope type's required fields, optional fields, field types,
   and allowed block or inline hierarchy using specification field names.
3. Add specification coverage sets and normalized contract fixtures.
4. Confirm the contract with the Seafile AI producer before changing the
   consumer.
5. Update the SDoc skill and tool prompt to forbid `<reference_N>` inside the
   artifact and to use a plain-text Sources section when needed.

### Phase 2: Compiler foundation

1. Add semantic validation and limits.
2. Extract ID and text helpers from `seahub/ai/utils.py`.
3. Implement text marks, inline containers, and basic blocks.
4. Correct multi-line code generation and code defaults.
5. Correct table defaults and support inline cell content.
6. Add generated SDoc validation.
7. Migrate existing content types to the compiler without changing file
   persistence behavior.

### Phase 3: Complete self-contained types

1. Add callout, formula, subtitle, and check-list attributes.
2. Add link and embed-link validation.
3. Add multi-column semantic compilation.
4. Add void element handling shared by the relevant types.
5. Complete the in-scope-elements compiler fixture and boundary tests.

### Phase 4: Artifact and persistence hardening

1. Switch SDoc artifact processing to `schema_version: 1` and `elements`.
2. Add a maximum number of creation artifacts per reply.
3. Preserve unrelated artifact types.
4. Move the complete generated-file lifecycle into `sdoc/service.py`.
5. Apply the explicit-intent, file-name, default-directory, target permission,
   and automatic conflict-rename policy.
6. Add SSE, result contract, database round-trip, and file lifecycle integration
   tests.
7. Update the frontend result model, remove root-fallback tips, add V1 error-code
   messages and translations, and display only the actual returned path.

### Phase 5: Local E2E

1. Add the local harness and redacted report format.
2. Add deterministic prompts and semantic content assertions that tolerate
   non-semantic wording variation from the LLM.
3. Create through the real Chat endpoint, Seafile AI, LLM, and Seafile RPC.
4. Download and validate the persisted file.
5. Obtain a dynamic SDoc access token through Seahub, then verify SDoc Server
   loading and Chat history persistence.
6. Add success and failure cleanup verification.
7. Document environment variables, service prerequisites, and invocation.

## Acceptance Criteria

- Every explicitly listed in-scope content type has an explicit
  semantic representation. The six deferred repository-backed types are
  rejected with a documented unsupported-type error.
- Every generated structural element follows the specification hierarchy.
- Rich-text marks survive compilation.
- Multi-line code produces one `code_line` per line.
- New tables use documented/current editor defaults.
- All generated IDs are non-empty and globally unique.
- Invalid input fails before writing a file.
- SDoc creation occurs only after an explicit current-user request.
- User-provided file names and languages are preserved, `.sdoc` is appended
  whenever the generated basename does not already end in `.sdoc`.
- An omitted target directory uses `/AI Generated/`; invalid or missing explicit
  directories fail without falling back to the repository root.
- Existing files are not overwritten in ordinary serial creation. A conflicting
  name receives an automatically renamed path, matching the current SDoc
  creation policy.
- Unit and integration tests cover core compiler behavior, representative
  complex formats, deferred-type rejection, and important error boundaries.
- The local E2E creates a file through Chat, downloads and validates it, and
  verifies cleanup using real Seahub and Seafile services.
- The local E2E uses the configured live model in the local development
  environment and is not part of online CI.

## Follow-up Items

- Confirm the documented V1 semantic AST with the Seafile AI producer before
  implementing both sides.
- Track repeated-final-result idempotency as a separate hardening task.
- Design repository-backed and specialized media elements in a separate phase.
