"""Pure-Python SDoc contract tests; no Django or Seafile services required.

Set SDOC_AI_ROOT to a seafile-ai checkout to also compare both validators.
"""

import importlib.util
import os
import sys
import unittest
from copy import deepcopy
from pathlib import Path
from types import ModuleType
from unittest.mock import patch


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def document_request(elements=None):
    return {
        'type': 'sdoc_create_request', 'schema_version': 1,
        'file_name': 'Plan', 'description': 'Project plan',
        'title': {'children': [{'type': 'text', 'text': 'Plan'}]},
        'elements': elements if elements is not None else [{'type': 'divider'}],
    }


def contract_cases():
    text = {'type': 'text', 'text': 'Content'}
    paragraph = {'type': 'paragraph', 'children': [text]}
    cell = {'children': [text]}
    cases = [('minimal', document_request(), True)]
    for name, element in (
        ('paragraph', paragraph),
        ('table', {'type': 'table', 'rows': [{'cells': [cell, cell]}] * 20}),
        ('large_table', {'type': 'table', 'rows': [{'cells': [cell] * 20}] * 20}),
        ('columns', {'type': 'multi_column', 'columns': [{'children': [paragraph]}] * 2}),
        ('embed', {'type': 'embed_link', 'link': 'https://example.com', 'link_type': 'figma', 'data': {'height': 400}}),
        ('code', {'type': 'code_block', 'language': '', 'text': ''}),
    ):
        cases.append((name, document_request([element]), True))
    for name, element in (
        ('unknown_type', {'type': 'image'}),
        ('unknown_field', {**paragraph, 'unexpected': True}),
        ('missing_children', {'type': 'paragraph'}),
        ('empty_children', {'type': 'paragraph', 'children': []}),
        ('blank_text', {'type': 'paragraph', 'children': [{**text, 'text': ' '}]}),
        ('wrong_mark_type', {'type': 'paragraph', 'children': [{**text, 'bold': 1}]}),
        ('boolean_number', {'type': 'paragraph', 'children': [{**text, 'font_size': True}]}),
        ('bad_color', {'type': 'paragraph', 'children': [{**text, 'color': '#abc\n'}]}),
        ('conflicting_marks', {'type': 'paragraph', 'children': [{**text, 'superscript': True, 'subscript': True}]}),
        ('non_finite', {'type': 'paragraph', 'children': [{**text, 'font_size': float('nan')}]}),
        ('citation', {'type': 'paragraph', 'children': [{**text, 'text': '<reference_0>'}]}),
        ('unsafe_link', {'type': 'paragraph', 'children': [{'type': 'link', 'href': 'javascript:alert(1)', 'title': 'Link', 'children': [text]}]}),
        ('http_embed', {'type': 'embed_link', 'link': 'http://example.com', 'link_type': 'figma'}),
        ('bad_height', {'type': 'embed_link', 'link': 'https://example.com', 'link_type': 'figma', 'data': {'height': 199}}),
        ('ragged_table', {'type': 'table', 'rows': [{'cells': [cell]}, {'cells': [cell, cell]}]}),
        ('too_many_cells', {'type': 'table', 'rows': [{'cells': [cell] * 21}]}),
        ('too_many_rows', {'type': 'table', 'rows': [{'cells': [cell]}] * 101}),
        ('one_column', {'type': 'multi_column', 'columns': [{'children': [paragraph]}]}),
    ):
        cases.append((name, document_request([element]), False))
    for field, value in (('file_name', '../Plan'), ('file_name', ' '), ('description', ''), ('description', None)):
        cases.append((f'{field}={value!r}', {**document_request(), field: value}, False))
    cases.append(('too_many_elements', document_request([{'type': 'divider'}] * 201), False))
    cases.append(('too_much_text', document_request([{'type': 'code_block', 'language': '', 'text': 'x' * 100001}]), False))
    return cases


class SdocContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_module('sdoc_request_schema', PROJECT_ROOT / 'seahub/ai/sdoc/schema.py')
        cls.validator = cls.module.SdocRequestValidator

    def test_contract_cases(self):
        for name, request, valid in contract_cases():
            with self.subTest(name=name):
                if valid:
                    self.validator.validate(request)
                else:
                    with self.assertRaises(self.module.SdocArtifactError):
                        self.validator.validate(request)

    def test_request_envelope(self):
        for changes, code in (
            ({'schema_version': 2}, 'unsupported_schema_version'),
            ({'schema_version': True}, 'invalid_artifact'),
            ({'type': 'other'}, 'invalid_artifact'),
            ({'unexpected': True}, 'invalid_artifact'),
        ):
            with self.subTest(changes=changes):
                with self.assertRaisesRegex(self.module.SdocArtifactError, code):
                    self.validator.validate({**document_request(), **changes})
        for key in document_request():
            request = document_request()
            del request[key]
            with self.subTest(missing=key), self.assertRaises(self.module.SdocArtifactError):
                self.validator.validate(request)

    def test_budget_precedes_schema_validation(self):
        for elements in ([{'nested': [[[[[]]]]]}], [{'type': 'divider'}] * 25):
            with self.subTest(elements=elements):
                with patch.object(self.validator, 'MAX_DEPTH', 5), \
                        patch.object(self.validator, 'MAX_NODES', 20), \
                        patch.object(self.validator, '_schema_validator') as validator:
                    with self.assertRaises(self.module.SdocArtifactError):
                        self.validator.validate(document_request(elements))
                    validator.validate.assert_not_called()

    def test_does_not_modify_document(self):
        request = document_request()
        request.update(file_name=' Plan ', description=' Project plan ')
        original = deepcopy(request)
        result = self.validator.validate(request)
        self.assertEqual(request, original)
        self.assertEqual(result['file_name'], 'Plan')
        self.assertEqual(result['description'], 'Project plan')

    def test_compiles_valid_contract_documents(self):
        directory = PROJECT_ROOT / 'seahub/ai/sdoc'
        compiler = load_module('sdoc_contract_compiler', directory / 'compiler.py')
        with patch.dict(sys.modules, {'sdoc_contract.compiler': compiler}):
            output_validator = load_module('sdoc_contract.validator', directory / 'validator.py')
        for name, request, valid in contract_cases():
            if valid:
                with self.subTest(name=name):
                    content = compiler.compile_sdoc(self.validator.validate(request), 'user@example.com')
                    output_validator.validate_sdoc(content)

    def test_budget_boundary_matches_ai_argument_shape(self):
        request = document_request()
        arguments = {
            'file_name': request['file_name'], 'description': request['description'],
            'elements': {'title': request['title'], 'elements': request['elements']},
        }
        def string_length(value):
            if isinstance(value, str):
                return len(value)
            if isinstance(value, dict):
                return sum(len(key) + string_length(child) for key, child in value.items())
            if isinstance(value, list):
                return sum(string_length(child) for child in value)
            return 0

        limit = string_length(arguments)
        with patch.object(self.validator, 'MAX_TEXT_LENGTH', limit):
            self.validator.validate(request)
        with patch.object(self.validator, 'MAX_TEXT_LENGTH', limit - 1):
            with self.assertRaisesRegex(self.module.SdocArtifactError, 'content_too_large'):
                self.validator.validate(request)

    @unittest.skipUnless(os.environ.get('SDOC_AI_ROOT'), 'Set SDOC_AI_ROOT for cross-repository checks')
    def test_matches_ai_schema_and_validation(self):
        tools = ModuleType('seafile_ai.utils.tools')
        tools.BasicTool = object
        path = Path(os.environ['SDOC_AI_ROOT']) / 'seafile_ai/chat_manager/tools/sdoc_tools/create_sdoc.py'
        with patch.dict(sys.modules, {'seafile_ai.utils.tools': tools}):
            ai = load_module('sdoc_ai_contract', path)
        self.assertEqual(self.validator.DOCUMENT_SCHEMA, ai.ELEMENTS_SCHEMA)
        for name in ('MAX_NODES', 'MAX_TEXT_LENGTH', 'MAX_DEPTH', 'SCHEMA_VERSION'):
            self.assertEqual(getattr(self.validator, name), getattr(ai.SdocValidator, name))
        for name, request, valid in contract_cases():
            with self.subTest(name=name):
                arguments = {
                    'file_name': request['file_name'], 'description': request['description'],
                    'elements': {'title': request['title'], 'elements': request['elements']},
                }
                if valid:
                    self.assertEqual(self.validator.validate(request), {'type': 'sdoc_create_request', **ai.SdocValidator.validate(**arguments)})
                else:
                    with self.assertRaises(ValueError):
                        ai.SdocValidator.validate(**arguments)
                    with self.assertRaises(self.module.SdocArtifactError):
                        self.validator.validate(request)


if __name__ == '__main__':
    unittest.main()
