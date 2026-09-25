from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase

from seahub.ai.sdoc.compiler import compile_sdoc
from seahub.ai.sdoc.schema import SdocArtifactError, normalize_sdoc_request
from seahub.ai.sdoc.service import create_sdoc
from seahub.ai.sdoc.validator import validate_sdoc
from seahub.ai.utils import process_sdoc_artifacts


def text(value, **marks):
    return {'type': 'text', 'text': value, **marks}


def complex_request():
    return {
        'type': 'sdoc_create_request',
        'schema_version': 1,
        'file_name': 'Plan',
        'title': {'children': [text('Release ', bold=True), text('Plan')]},
        'summary': 'A representative document.',
        'elements': [
            {'type': 'header1', 'children': [text('Goals')]},
            {'type': 'paragraph', 'children': [
                text('Read '),
                {'type': 'link', 'href': 'https://example.com', 'title': 'details', 'children': [text('details')]},
            ]},
            {'type': 'blockquote', 'children': [text('Quoted content', italic=True)]},
            {'type': 'callout', 'children': [
                {'type': 'paragraph', 'children': [text('Important')]},
            ]},
            {'type': 'check_list_item', 'checked': False, 'children': [text('Review')]},
            {'type': 'ordered_list', 'items': [
                {'children': [text('First')]},
                {'children': [text('Second')]},
            ]},
            {'type': 'code_block', 'language': 'python', 'text': 'one\ntwo\n'},
            {'type': 'formula', 'data': {'formula': 'E = mc^2'}},
            {'type': 'table', 'rows': [
                {'cells': [{'children': [text('Name', bold=True)]}, {'children': [text('Owner', bold=True)]}]},
                {'cells': [{'children': [text('Plan')]}, {'children': [text('Alice')]}]},
            ]},
            {'type': 'multi_column', 'columns': [
                {'children': [{'type': 'paragraph', 'children': [text('Left')]}]},
                {'children': [{'type': 'paragraph', 'children': [text('Right')]}]},
            ]},
        ],
    }


class SdocContentTest(SimpleTestCase):
    def test_compiles_representative_complex_document(self):
        normalized = normalize_sdoc_request(complex_request())
        content = validate_sdoc(compile_sdoc(normalized, 'user@example.com'))

        self.assertEqual(content['format_version'], 4)
        self.assertEqual(content['elements'][0]['type'], 'title')
        self.assertTrue(content['elements'][0]['children'][0]['bold'])
        self.assertEqual(content['elements'][-1]['type'], 'paragraph')

        code = next(element for element in content['elements'] if element['type'] == 'code_block')
        self.assertEqual([line['children'][0]['text'] for line in code['children']], ['one', 'two', ''])

        table = next(element for element in content['elements'] if element['type'] == 'table')
        self.assertEqual(table['columns'], [{'width': 336}, {'width': 336}])
        self.assertEqual(table['children'][0]['children'][0]['style']['align_items'], 'center')

        multi_column = next(element for element in content['elements'] if element['type'] == 'multi_column')
        self.assertEqual(multi_column['column'][1]['left'], 300)
        self.assertEqual(multi_column['column'][0]['key'], multi_column['children'][0]['id'])

    def test_rejects_deferred_element(self):
        request_data = complex_request()
        request_data['elements'] = [{'type': 'image'}]
        with self.assertRaisesRegex(SdocArtifactError, 'unsupported_element_type'):
            normalize_sdoc_request(request_data)

    def test_rejects_internal_reference_token(self):
        request_data = complex_request()
        request_data['elements'] = [{'type': 'paragraph', 'children': [text('Source <reference_0>')]}]
        with self.assertRaisesRegex(SdocArtifactError, 'invalid_artifact'):
            normalize_sdoc_request(request_data)

    def test_rejects_ragged_table(self):
        request_data = complex_request()
        request_data['elements'] = [{'type': 'table', 'rows': [
            {'cells': [{'children': [text('A')]}]},
            {'cells': [{'children': [text('A')]}, {'children': [text('B')]}]},
        ]}]
        with self.assertRaisesRegex(SdocArtifactError, 'invalid_artifact'):
            normalize_sdoc_request(request_data)


class SdocServiceTest(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get('/')

    @patch('seahub.ai.sdoc.service.ENABLE_SEADOC', True)
    @patch('seahub.ai.sdoc.service.get_seadoc_file_uuid', return_value='doc-uuid')
    @patch('seahub.ai.sdoc.service.seafile_api.get_repo')
    @patch('seahub.ai.sdoc.service.seafile_api.post_file')
    @patch('seahub.ai.sdoc.service.check_filename_with_rename', return_value='Plan (1).sdoc')
    @patch('seahub.ai.sdoc.service.check_folder_permission', return_value='rw')
    @patch('seahub.ai.sdoc.service.seafile_api.get_dir_id_by_path', return_value='dir-id')
    def test_creates_in_default_directory_with_renamed_file(self, mock_get_dir, mock_permission,
                                                            mock_rename, mock_post, mock_repo, mock_uuid):
        result = create_sdoc(complex_request(), '12345678-1234-1234-1234-123456789abc', self.request, 'user@example.com')

        self.assertEqual(result['status'], 'created')
        self.assertEqual(result['schema_version'], 1)
        self.assertEqual(result['name'], 'Plan (1).sdoc')
        self.assertEqual(result['path'], '/AI Generated/Plan (1).sdoc')
        mock_rename.assert_called_once_with('12345678-1234-1234-1234-123456789abc', '/AI Generated/', 'Plan.sdoc')

    @patch('seahub.ai.sdoc.service.ENABLE_SEADOC', True)
    @patch('seahub.ai.sdoc.service.seafile_api.get_dir_id_by_path', return_value=None)
    def test_explicit_missing_directory_fails_without_fallback(self, mock_get_dir):
        request_data = complex_request()
        request_data['requested_directory'] = '/missing'
        result = create_sdoc(request_data, 'repo-id', self.request, 'user@example.com')

        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['error_code'], 'directory_not_found')


class SdocArtifactTest(SimpleTestCase):
    @patch('seahub.ai.utils.create_sdoc', return_value={'type': 'sdoc', 'status': 'created'})
    def test_creates_only_one_sdoc_per_ai_result(self, mock_create_sdoc):
        artifacts = [complex_request(), complex_request()]

        result = process_sdoc_artifacts(
            {'artifacts': artifacts},
            'repo-id',
            RequestFactory().get('/'),
            'session-uuid',
            'message-id',
            'user@example.com',
        )

        self.assertEqual(mock_create_sdoc.call_count, 1)
        self.assertEqual(result['artifacts'][0]['status'], 'created')
        self.assertEqual(result['artifacts'][1]['status'], 'failed')
        self.assertEqual(result['artifacts'][1]['error_code'], 'invalid_artifact')
