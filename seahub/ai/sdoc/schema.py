import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError


class SdocArtifactError(ValueError):
    def __init__(self, code='invalid_artifact'):
        super().__init__(code)
        self.code = code


class SdocRequestValidator:
    SCHEMA_VERSION = 1
    MAX_NODES = 20000
    MAX_TEXT_LENGTH = 100000
    MAX_DEPTH = 32
    REFERENCE_RE = re.compile(r'<reference_\d+>')
    COLOR_RE = re.compile(r'^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$')

    DOCUMENT_SCHEMA = json.loads(Path(__file__).with_name('document_schema.json').read_text(encoding='utf-8'))
    REQUEST_SCHEMA = {
        'type': 'object',
        'properties': {
            'type': {'const': 'sdoc_create_request'},
            'schema_version': {'type': 'integer', 'const': SCHEMA_VERSION},
            'file_name': {'type': 'string'},
            'description': {'type': 'string'},
            **DOCUMENT_SCHEMA['properties'],
        },
        'required': ['type', 'schema_version', 'file_name', 'description', 'title', 'elements'],
        'additionalProperties': False,
        '$defs': DOCUMENT_SCHEMA['$defs'],
    }
    Draft202012Validator.check_schema(REQUEST_SCHEMA)
    _schema_validator = Draft202012Validator(REQUEST_SCHEMA)

    @classmethod
    def validate(cls, value):
        if not isinstance(value, dict):
            raise SdocArtifactError()
        if set(value) - set(cls.REQUEST_SCHEMA['properties']) or value.get('type') != 'sdoc_create_request':
            raise SdocArtifactError()
        if 'schema_version' in value and value['schema_version'] != cls.SCHEMA_VERSION:
            raise SdocArtifactError('unsupported_schema_version')

        # Use the AI tool argument shape so budgets have identical semantics.
        parameters = {
            'file_name': value.get('file_name'),
            'description': value.get('description'),
            'elements': {'title': value.get('title'), 'elements': value.get('elements')},
        }
        cls._check_document_budget(parameters)
        try:
            cls._schema_validator.validate(value)
        except ValidationError as error:
            raise SdocArtifactError() from error

        file_name = cls._string(value['file_name']).strip()
        if '/' in file_name or '\\' in file_name or any(ord(char) < 32 for char in file_name) or file_name in ('.', '..', '.sdoc'):
            raise SdocArtifactError('invalid_file_name')
        description = cls._string(value['description']).strip()
        cls._validate_document_semantics(parameters['elements'])
        return {**value, 'file_name': file_name, 'description': description}

    @staticmethod
    def _string(value):
        if not isinstance(value, str) or not value.strip():
            raise SdocArtifactError()
        return value

    @classmethod
    def _check_document_budget(cls, document):
        nodes = text_length = 0
        pending = [(document, 0)]
        while pending:
            value, depth = pending.pop()
            nodes += 1
            if depth > cls.MAX_DEPTH:
                raise SdocArtifactError('invalid_hierarchy')
            if isinstance(value, str):
                text_length += len(value)
            elif isinstance(value, float) and not math.isfinite(value):
                raise SdocArtifactError()
            elif isinstance(value, dict):
                text_length += sum(len(key) for key in value if isinstance(key, str))
                pending.extend((child, depth + 1) for child in value.values())
            elif isinstance(value, list):
                pending.extend((child, depth + 1) for child in value)
            if nodes + len(pending) > cls.MAX_NODES or text_length > cls.MAX_TEXT_LENGTH:
                raise SdocArtifactError('content_too_large')
        if len(json.dumps(document, ensure_ascii=False, allow_nan=False)) > cls.MAX_TEXT_LENGTH * 4:
            raise SdocArtifactError('content_too_large')

    @classmethod
    def _validate_url(cls, value, https_only=False):
        parsed = urlparse(cls._string(value))
        schemes = ('https',) if https_only else ('http', 'https')
        if parsed.scheme.lower() not in schemes or not parsed.netloc:
            raise SdocArtifactError()

    @classmethod
    def _validate_document_semantics(cls, value):
        if isinstance(value, list):
            for child in value:
                cls._validate_document_semantics(child)
        elif isinstance(value, dict):
            kind = value.get('type')
            if kind == 'text' and value.get('superscript') and value.get('subscript'):
                raise SdocArtifactError()
            if kind == 'link':
                cls._validate_url(value['href'])
                cls._string(value['title'])
            elif kind == 'embed_link':
                cls._validate_url(value['link'], https_only=True)
            elif kind == 'formula':
                cls._string(value['data']['formula'])
            elif kind == 'table':
                if len({len(row['cells']) for row in value['rows']}) != 1:
                    raise SdocArtifactError()

            children = value.get('children', [])
            if children and all(child.get('type') in ('text', 'link') for child in children):
                if not any(child['type'] == 'link' or child['text'].strip() for child in children):
                    raise SdocArtifactError()

            for key, child in value.items():
                if key in ('color', 'highlight_color', 'background_color') and not cls.COLOR_RE.fullmatch(child):
                    raise SdocArtifactError()
                if isinstance(child, str) and cls.REFERENCE_RE.search(child):
                    raise SdocArtifactError()
                cls._validate_document_semantics(child)
