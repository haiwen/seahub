"""Standalone boundary tests: python3 tests/seahub/ai/test_generated_sdoc.py."""
import ast
import importlib.util
import json
import logging
import os
import posixpath
import re
import sys
import tempfile
import unittest
import uuid
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[3]


def load_sdoc(test_case):
    modules = {}
    for name in ('seaserv', 'seahub.settings', 'seahub.seadoc.utils', 'seahub.utils',
                 'seahub.utils.repo', 'seahub.views'):
        modules[name] = ModuleType(name)
    modules['seaserv'].seafile_api = Mock()
    modules['seahub.settings'].ENABLE_SEADOC = True
    modules['seahub.seadoc.utils'].get_seadoc_file_uuid = Mock(return_value='doc-uuid')
    modules['seahub.utils'].check_filename_with_rename = Mock(side_effect=lambda repo, directory, name: name)
    modules['seahub.utils'].is_valid_dirent_name = lambda name: bool(name)
    modules['seahub.utils'].mkstemp = tempfile.mkstemp
    modules['seahub.utils.repo'].parse_repo_perm = lambda permission: (
        permission if hasattr(permission, 'can_create') else SimpleNamespace(can_create=permission == 'rw'))
    modules['seahub.views'].check_folder_permission = Mock(return_value='rw')
    module = ModuleType('generated_sdoc_test')
    module.__dict__.update({
        'json': json, 'os': os, 'posixpath': posixpath, 'uuid': uuid,
        'escape': escape, 'HTMLParser': HTMLParser, 'logger': logging.getLogger(__name__),
        'GENERATED_DIRECTORY': '/AI Generated/', 'TAG_NAME': 'seafile-ai-seadoc',
        'MAX_SDOC_CONTENT_LENGTH': 400000, 'MAX_SDOC_TRANSPORT_LENGTH': 2400002,
        'seafile_api': modules['seaserv'].seafile_api,
        'ENABLE_SEADOC': True,
        'check_filename_with_rename': modules['seahub.utils'].check_filename_with_rename,
        'is_valid_dirent_name': modules['seahub.utils'].is_valid_dirent_name,
        'mkstemp': tempfile.mkstemp,
        'check_folder_permission': modules['seahub.views'].check_folder_permission,
        'get_seadoc_file_uuid': modules['seahub.seadoc.utils'].get_seadoc_file_uuid,
    })
    names = {'_node', '_inline', '_paragraph', '_compile_block', 'compile_sdoc',
             '_TagParser', 'result_tag', '_can_create', 'create_generated_sdoc'}
    source = ast.parse((ROOT / 'seahub/ai/utils.py').read_text())
    tree = ast.Module(body=[node for node in source.body
                            if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names], type_ignores=[])
    module_patch = patch.dict(sys.modules, modules)
    module_patch.start()
    test_case.addCleanup(module_patch.stop)
    exec(compile(tree, 'seahub/ai/utils.py', 'exec'), module.__dict__)
    return module


def load_result_helpers(sdoc):
    """Load the real orchestration functions without a running Django/Seafile stack."""
    source = ast.parse((ROOT / 'seahub/ai/utils.py').read_text())
    names = {'process_generated_content_result', 'process_stream_ai_reply', 'process_markdown_block'}
    tree = ast.Module(body=[node for node in source.body
                            if isinstance(node, ast.FunctionDef) and node.name in names], type_ignores=[])
    spec = importlib.util.spec_from_file_location('content_blocks', ROOT / 'seahub/ai/content_blocks.py')
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    markdown = Mock(side_effect=lambda block, *args, **kwargs: block['raw'])
    creator = Mock(wraps=sdoc.create_generated_sdoc)
    scope = {
        're': re, 'json': json, 'parse_content_blocks': parser.parse_content_blocks,
        'CONTENT_BLOCK_TAGS': parser.CONTENT_BLOCK_TAGS,
        'GENERATED_CONTENT_HANDLERS': {'seafile-ai-markdown': markdown, 'seafile-ai-seadoc': creator},
        'logger': logging.getLogger(__name__), 'cache': Mock(),
        'escape': escape, 'unescape': unescape, '_': lambda text: text,
        'os': os, 'GENERATED_MARKDOWN_DIR': '/AI Generated/',
        'upload_generated_markdown_file': Mock(return_value=('notes.md', '/smart-link/doc/notes.md')),
        'record_message_to_db': Mock(side_effect=lambda result, *args: result),
    }
    exec(compile(tree, 'seahub/ai/utils.py', 'exec'), scope)
    return scope, creator, markdown


class GeneratedSdocTest(unittest.TestCase):
    def setUp(self):
        self.sdoc = load_sdoc(self)
        self.helpers, self.creator, self.markdown = load_result_helpers(self.sdoc)
        self.request = SimpleNamespace(user=SimpleNamespace(username='user'))
        self.document = {'title': '计划', 'elements': [
            {'type': 'paragraph', 'children': [{'text': 'Hi', 'bold': True}]},
            {'type': 'ordered_list', 'items': [{'children': [{'text': 'First'}]}]},
            {'type': 'code_block', 'language': 'python', 'text': 'print(1)\nprint(2)'},
            {'type': 'table', 'rows': [{'cells': [{'children': [{'text': 'A'}]}]}]},
        ]}
        self.tag = '<seafile-ai-seadoc sdoc_create_uuid="12345678-1234-4234-8234-123456789abc" file_name="计划.sdoc" description="A &amp; B">%s</seafile-ai-seadoc>' % json.dumps(self.document)

    def process(self, reply, **kwargs):
        return self.helpers['process_generated_content_result'](
            {'ai_reply': reply, 'answer': reply}, 'repo', 'user', request=self.request, **kwargs)

    def test_compile_supplies_editor_structure_and_unique_ids(self):
        compiled = self.sdoc.compile_sdoc(self.document, 'user')
        self.assertEqual(compiled['format_version'], 4)
        self.assertEqual(compiled['last_modify_user'], 'user')
        self.assertEqual(compiled['elements'][0]['children'][0]['text'], '计划')
        self.assertEqual(compiled['elements'][2]['children'][0]['type'], 'list_item')
        self.assertEqual(len(compiled['elements'][3]['children']), 2)
        self.assertEqual(compiled['elements'][-1]['type'], 'paragraph')
        ids = []

        def visit(node):
            ids.append(node['id'])
            for child in node.get('children', []):
                visit(child)

        for element in compiled['elements']:
            visit(element)
        self.assertEqual(len(ids), len(set(ids)))

    def test_creates_file_and_replaces_json_with_metadata(self):
        written = []

        def post(repo, path, directory, name, username):
            written.append(json.loads(Path(path).read_text()))

        self.sdoc.seafile_api.post_file.side_effect = post
        self.sdoc.check_filename_with_rename.side_effect = lambda *args: '计划 (1).sdoc'
        result = self.process(self.tag)
        self.assertIn('status="created"', result['ai_reply'])
        self.assertIn('file_name="计划 (1).sdoc"', result['ai_reply'])
        self.assertIn('doc_uuid="doc-uuid"', result['ai_reply'])
        self.assertIn('sdoc_create_uuid="12345678-1234-4234-8234-123456789abc"', result['ai_reply'])
        self.assertIn('description="A &amp; B"', result['ai_reply'])
        self.assertNotIn('"elements"', result['ai_reply'])
        self.assertEqual(result['answer'], result['ai_reply'])
        self.assertEqual(written[0]['elements'][0]['type'], 'title')

    def test_permission_and_feature_failures_never_write(self):
        self.sdoc.check_folder_permission.return_value = 'r'
        self.assertIn('permission_denied', self.process(self.tag)['ai_reply'])
        self.sdoc.ENABLE_SEADOC = False
        self.assertIn('sdoc_not_enabled', self.process(self.tag)['ai_reply'])
        self.sdoc.seafile_api.post_file.assert_not_called()

    def test_target_create_permission_overrides_root_upload_snapshot(self):
        for permission in ['rw', SimpleNamespace(can_create=True, can_upload=False)]:
            with self.subTest(permission=permission):
                self.sdoc.check_folder_permission.side_effect = lambda request, repo, path: permission if path == '/AI Generated/' else 'r'
                self.sdoc.seafile_api.post_file.reset_mock()
                self.assertIn('status="created"', self.process(self.tag, can_upload=False)['ai_reply'])
                self.sdoc.seafile_api.post_file.assert_called_once()
        self.sdoc.seafile_api.get_dir_id_by_path.return_value = None
        self.sdoc.seafile_api.post_file.reset_mock()
        self.assertIn('permission_denied', self.process(self.tag, can_upload=False)['ai_reply'])
        self.sdoc.seafile_api.post_file.assert_not_called()
        self.sdoc.seafile_api.mkdir_with_parents.assert_not_called()

    def test_creates_missing_directory_only_with_root_permission(self):
        self.sdoc.seafile_api.get_dir_id_by_path.return_value = None
        self.process(self.tag)
        self.sdoc.check_folder_permission.assert_any_call(self.request, 'repo', '/')
        self.sdoc.seafile_api.mkdir_with_parents.assert_called_once_with('repo', '/', 'AI Generated', 'user')

    def test_deduplicates_and_skips_processed_tags_and_code(self):
        result = self.process(self.tag + '\n' + self.tag)
        self.sdoc.seafile_api.post_file.assert_called_once()
        self.process(result['ai_reply'])
        self.sdoc.seafile_api.post_file.assert_called_once()
        self.creator.reset_mock()
        self.assertEqual(self.process('```\n' + self.tag + '\n```')['ai_reply'], '```\n' + self.tag + '\n```')
        self.creator.assert_not_called()

    def test_mixed_markdown_and_sdoc_and_embedded_examples(self):
        markdown = '<seafile-ai-markdown file_name="example.md">' + self.tag + '</seafile-ai-markdown>'
        result = self.process(markdown + '\n' + self.tag)
        self.markdown.assert_called_once()
        self.creator.assert_called_once()
        self.assertIn(markdown, result['ai_reply'])
        self.assertIn('status="created"', result['ai_reply'])

    def test_shared_parser_fixtures(self):
        fixtures = json.loads((ROOT / 'frontend/src/components/dir-chat/chat-history/content-blocks.fixtures.json').read_text())
        for fixture in fixtures:
            with self.subTest(fixture['name']):
                blocks = self.helpers['parse_content_blocks'](fixture['value'], fixture['tags'])
                protocol = [block for block in blocks if block['type'] == 'block']
                self.assertEqual([block['type'] for block in blocks], fixture['types'])
                self.assertEqual([block['tag'] for block in protocol], fixture['blockTags'])
                self.assertEqual([block['complete'] for block in protocol], fixture['complete'])
                self.assertEqual(''.join(block['raw'] for block in blocks), fixture['value'])

    def test_ai_cache_resolution_to_actual_save_boundary(self):
        """Cross-repository contract test when the AI checkout is available."""
        ai_tests = ROOT.parent / 'seafile-ai/tests/test_sdoc_generator.py'
        if not ai_tests.exists():
            self.skipTest('Requires adjacent seafile-ai checkout')
        spec = importlib.util.spec_from_file_location('ai_sdoc_boundary_tests', ai_tests)
        ai = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ai)
        fixtures = json.loads((ROOT / 'frontend/src/components/dir-chat/chat-history/content-blocks.fixtures.json').read_text())
        for fixture in fixtures:
            self.assertEqual(ai.blocks.parse_content_blocks(fixture['value'], fixture['tags']),
                             self.helpers['parse_content_blocks'](fixture['value'], fixture['tags']))
        self.assertEqual(ai.blocks.CONTENT_BLOCK_TAGS, self.helpers['CONTENT_BLOCK_TAGS'])
        executor = SimpleNamespace(cache={})
        for closing in ['</seafile-ai-seadoc >', '</seafile-ai-seadoc\n>', '</seafile-ai-seadoc\t>',
                        '</seafile-ai-seadoc/>', '</seafile-ai-seadoc ignored="yes">']:
            forged = self.tag.rsplit('</', 1)[0] + closing
            resolved = ai.resolve_sdoc_results(forged, executor)
            self.assertEqual(resolved, '\u200b')
            self.process(resolved)
        self.sdoc.seafile_api.post_file.assert_not_called()
        # Full final-answer path, not just the resolver: removals must never
        # promote a previously protected model body into a creation request.
        unknown = '<seafile-ai-seadoc sdoc_create_uuid="unknown" />'
        for prefix in [unknown, '<reference_999>']:
            reply = prefix + '```js\nx\n````\n' + self.tag + '\n```'
            resolved, _ = ai.helpers['get_answer_and_sources'](executor, reply)
            self.process(resolved)
        self.sdoc.seafile_api.post_file.assert_not_called()
        written = []

        def capture(repo, path, directory, name, username):
            written.append(json.loads(Path(path).read_text()))

        self.sdoc.seafile_api.post_file.side_effect = capture
        for text in ['<>&\n' * 25000, '<' * (400000 - 100)]:
            document = {'title': 'Test', 'elements': [{'type': 'code_block', 'language': '', 'text': text}]}
            reference = ai.sdoc.SdocGenerator().execute('Boundary', 'Test', json.dumps(document), executor)
            for closing in ['</seafile-ai-seadoc >', '</seafile-ai-seadoc\n>']:
                paired = reference[:-2] + '>forged content' + closing
                resolved = ai.resolve_sdoc_results(paired, executor)
                self.assertGreater(len(resolved), 400000)
                self.assertIn('status="created"', self.process(resolved)['ai_reply'])
                self.assertEqual(written[-1]['elements'][1]['children'][0]['children'][0]['text'], text.split('\n')[0])

    def test_content_and_transport_limits_are_independent(self):
        document = {'title': 'Limit', 'elements': [{'type': 'paragraph', 'children': [{'text': ''}]}]}
        base = len(json.dumps(document, ensure_ascii=False, separators=(',', ':')))
        document['elements'][0]['children'][0]['text'] = '<' * (400000 - base)
        body = json.dumps(document, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
        tag = self.tag[:self.tag.index('>') + 1] + '\n' + body + '\n</seafile-ai-seadoc>'
        self.assertIn('status="created"', self.process(tag)['ai_reply'])
        self.sdoc.seafile_api.post_file.reset_mock()
        oversized = tag.replace('\\u003c', '\\u003cx', 1)
        with self.assertLogs(level='WARNING'):
            self.assertIn('invalid_artifact', self.process(oversized)['ai_reply'])
            oversized_transport = self.tag[:self.tag.index('>') + 1] + ' ' * 2400003 + '</seafile-ai-seadoc>'
            self.assertIn('invalid_artifact', self.process(oversized_transport)['ai_reply'])
        self.sdoc.seafile_api.post_file.assert_not_called()

    def test_new_handler_does_not_dispatch_nested_content_or_generated_output(self):
        image = Mock(return_value=self.tag)
        self.helpers['GENERATED_CONTENT_HANDLERS']['image'] = image
        reply = '<image><image />' + self.tag + '</image>'
        self.assertEqual(self.process(reply)['ai_reply'], self.tag)
        image.assert_called_once()
        self.creator.assert_not_called()
        self.markdown.assert_not_called()
        self.process('<image />')
        self.assertEqual(image.call_count, 2)

    def test_sdoc_json_with_unbalanced_backticks_is_opaque(self):
        self.document['elements'][0]['children'][0]['text'] = '```example <image src="test" />'
        tag = self.tag[:self.tag.index('>') + 1] + json.dumps(self.document) + '</seafile-ai-seadoc>'
        self.assertIn('status="created"', self.process(tag)['ai_reply'])

    def test_unclosed_blocks_and_code_never_create_files(self):
        for reply in ['```\n' + self.tag, '<seafile-ai-markdown>' + self.tag, self.tag[:-5]]:
            self.assertEqual(self.process(reply)['ai_reply'], reply)
        self.creator.assert_not_called()
        self.markdown.assert_not_called()

    def test_fenced_examples_never_write_and_real_following_requests_do(self):
        examples = [
            '> ```js\n> const marker = "```";\n> ' + self.tag + '\n> ```\n',
            '- Example\n  ```js\n  const marker = "```";\n  ' + self.tag + '\n  ```\n',
            '> 1. ~~~~js\n>    ~~~~suffix\n>    ' + self.tag + '\n>    ~~~~~\n',
            '```js\nconst marker = "```";\n' + self.tag + '\n```\n',
            '````js\n```\n' + self.tag + '\n`````\n',
            '   ~~~~js\r\n~~~\r\n~~~~suffix\r\n' + self.tag + '\r\n  ~~~~~ \t\r\n',
            '``start `\n' + self.tag + '\n``` still code ``',
        ]
        for example in examples:
            with self.subTest(example=example[:30]):
                self.sdoc.seafile_api.post_file.reset_mock()
                self.creator.reset_mock()
                self.assertEqual(self.process(example)['ai_reply'], example)
                self.creator.assert_not_called()
                self.sdoc.seafile_api.post_file.assert_not_called()
                result = self.process(example + self.tag)['ai_reply']
                self.assertTrue(result.startswith(example))
                self.assertIn('status="created"', result[len(example):])
                self.sdoc.seafile_api.post_file.assert_called_once()

    def test_markdown_handler_uploads_opaque_body_and_replaces_stale_metadata(self):
        self.helpers['GENERATED_CONTENT_HANDLERS']['seafile-ai-markdown'] = self.helpers['process_markdown_block']
        body = '<seafile-ai-markdown>nested</seafile-ai-markdown>' + self.tag
        markdown = '<seafile-ai-markdown file_name="A &amp; B.md">' + body + '</seafile-ai-markdown>'
        reply = '<seafile-ai-markdown-link url="old"></seafile-ai-markdown-link>' + markdown
        result = self.process(reply)['ai_reply']
        self.helpers['upload_generated_markdown_file'].assert_called_once_with('repo', 'user', 'A & B.md', body)
        self.assertNotIn('url="old"', result)
        self.assertIn('/smart-link/doc/notes.md', result)
        self.assertIn(markdown, result)
        self.creator.assert_not_called()

    def test_markdown_permission_and_upload_failure_preserve_body(self):
        self.helpers['GENERATED_CONTENT_HANDLERS']['seafile-ai-markdown'] = self.helpers['process_markdown_block']
        markdown = '<seafile-ai-markdown file_name="notes.md">body</seafile-ai-markdown>'
        readonly = self.process(markdown, can_upload=False)['ai_reply']
        self.assertIn(markdown, readonly)
        self.assertIn('<markdown-readonly-tips>', readonly)
        self.helpers['upload_generated_markdown_file'].assert_not_called()
        self.helpers['upload_generated_markdown_file'].side_effect = RuntimeError('unavailable')
        with self.assertLogs(level='WARNING'):
            failed = self.process(markdown)['ai_reply']
        self.assertIn(markdown, failed)
        self.assertIn('Failed to upload', failed)

    def test_no_request_never_grants_creation_permission(self):
        self.request = None
        self.assertIn('permission_denied', self.process(self.tag)['ai_reply'])
        self.sdoc.seafile_api.post_file.assert_not_called()

    def test_uuid_failure_keeps_successful_write_and_path(self):
        self.sdoc.get_seadoc_file_uuid.side_effect = RuntimeError('UUID service unavailable')
        with self.assertLogs(self.sdoc.logger, level='ERROR'):
            reply = self.process(self.tag)['ai_reply']
        self.assertIn('status="created"', reply)
        self.assertIn('path="/AI Generated/计划.sdoc"', reply)
        self.sdoc.seafile_api.post_file.assert_called_once()

    def test_invalid_or_failed_writes_return_failure_tags(self):
        self.assertIn('invalid_artifact', self.process(self.tag.replace('计划.sdoc', '../计划.sdoc'))['ai_reply'])
        self.assertIn('invalid_artifact', self.process(self.tag.replace('"title":', '"missing":'))['ai_reply'])
        self.sdoc.seafile_api.post_file.side_effect = RuntimeError('unavailable')
        self.assertIn('create_failed', self.process(self.tag)['ai_reply'])

    def test_stream_only_creates_at_final_result_and_ignores_duplicate_results(self):
        result = json.dumps({'results': {'ai_reply': self.tag}}).encode()
        response = SimpleNamespace(iter_lines=lambda: iter([
            json.dumps({'answer': self.tag}).encode(), result, result, b'[DONE]']))
        items = list(self.helpers['process_stream_ai_reply'](
            'task', response, 'session', 'message', 'query', [], 'repo', 'user', request=self.request))
        self.sdoc.seafile_api.post_file.assert_called_once()
        self.helpers['record_message_to_db'].assert_called_once()
        self.assertEqual(len(items), 3)
        self.assertIn('status=\\"created\\"', items[1])


if __name__ == '__main__':
    unittest.main()
