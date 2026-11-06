# AI SDoc creation boundary

`SdocRequestValidator` validates the creation request independently of the AI
service. `document_schema.json` mirrors `ELEMENTS_SCHEMA` in seafile-ai; it is
loaded locally, never fetched from the AI service at runtime. Keep both document
schemas and their semantic checks synchronized when changing the contract.

The request envelope remains `type`, `schema_version`, `file_name`,
`description`, `title`, and `elements`. Validation checks resource budgets using
the AI tool argument shape, then applies JSON Schema and content/security rules.
Only filename and description whitespace is normalized; document nodes are not
rebuilt. Schema violations return `invalid_artifact`; unsupported versions,
unsafe filenames, excessive resource use, and excessive depth have dedicated
error codes. File permissions and safe destination names remain enforced by
the creation service.

The compiler converts semantic input into native SDoc nodes, and the output
validator checks those nodes before saving. Neither is replaced by input Schema
validation.

Successful responses contain only `status`, `name`, `path`, `doc_uuid`, and
`description`. Failures contain `status`, `error_code`, and an optional `name`.
The AI tool, not Seahub, turns this metadata into a `<seadoc ... />` chat tag.
This internal endpoint no longer returns `type`, `schema_version`,
`relative_path`, `repo_id`, `url`, or `title`.

Install the new `jsonschema` dependency from the repository requirements.
Run validation tests without Django/Seafile services:

```sh
python3 -m unittest discover -s tests -p test_sdoc_contract.py -v
```

To additionally compare the document schemas and run the same valid/invalid
requests through both repositories:

```sh
SDOC_AI_ROOT=/path/to/seafile-ai python3 -m unittest discover -s tests -p test_sdoc_contract.py -v
```

Service, permission, and native-document tests remain in
`tests/seahub/ai/test_sdoc_utils.py` and require the Seahub test environment.
