# Inline tool results

Tool result references live in the assistant message body, alongside Markdown:

```html
The document is ready:

<seadoc status="created" name="Plan.sdoc" path="/AI Generated/Plan.sdoc" doc_uuid="…" description="Release plan" />

Open it to continue editing.
```

`seadoc` accepts `status`, `name`, `path`, `doc_uuid`, `description`, and `error_code`.
`status` is `created`, `failed`, or `unknown`. A created result requires `name`
and an absolute `.sdoc` path in the current library. File links are constructed
locally using the conversation's library ID; arbitrary URLs are not accepted.

Failure examples:

```html
<seadoc status="failed" error_code="permission_denied" />
<seadoc status="unknown" error_code="creation_unconfirmed" />
```

The tool must HTML-escape attribute values, including quotes. Include only result
metadata, never document contents, credentials, or creation parameters. The tag
references an already executed tool: parsing or rendering it never creates a file.

`utils.js` transforms supported tags into local renderer references, skipping code
examples and suppressing incomplete streaming tags. `index.js` dispatches them to
React components and converts them into readable text/links for copying. Raw HTML
is not rendered. New tool types should add explicit parsing/validation, rendering,
and copy handling here, without adding message fields or database columns.

The AI service must include the complete tag in its streamed answer and final
`ai_reply`/`answer`. There is no separate `artifacts` message field.
