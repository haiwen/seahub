from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase

from seahub.ai.utils import build_sdoc_content, resolve_sdoc_target_directory


class SdocContentTest(SimpleTestCase):
    def test_builds_v4_sdoc_with_terminal_paragraph(self):
        content = build_sdoc_content('Plan', [
            {'type': 'heading', 'level': 1, 'text': 'Goals'},
            {'type': 'paragraph', 'text': 'Ship the feature.'},
            {'type': 'task_list', 'items': ['Review']},
        ], 'user@example.com')

        self.assertEqual(content['format_version'], 4)
        self.assertEqual(content['elements'][0]['type'], 'title')
        self.assertEqual(content['elements'][-1]['type'], 'paragraph')
        self.assertEqual(content['elements'][-1]['children'][0]['text'], '')

    def test_rejects_unsupported_block(self):
        with self.assertRaisesRegex(ValueError, 'invalid_artifact'):
            build_sdoc_content('Plan', [{'type': 'image'}], 'user@example.com')

    def test_builds_complete_table_structure(self):
        content = build_sdoc_content('Plan', [{
            'type': 'table',
            'headers': ['Task', 'Owner'],
            'rows': [['Review', 'Alice']],
        }], 'user@example.com')

        table = content['elements'][1]
        self.assertEqual(table['columns'], [{'width': 120}, {'width': 120}])
        self.assertEqual(table['ui']['alternate_highlight'], False)
        self.assertEqual(table['children'][0]['style']['min_height'], 42)
        self.assertEqual(table['children'][0]['children'][0]['style'], {})
        self.assertEqual(table['children'][0]['children'][0]['inherit_style'], {})


class SdocDirectoryTest(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get('/')

    @patch('seahub.ai.utils.check_folder_permission', return_value='rw')
    @patch('seahub.ai.utils.seafile_api.get_dir_id_by_path', return_value=None)
    def test_missing_directory_falls_back_to_root(self, mock_get_dir, mock_permission):
        target_dir, reason = resolve_sdoc_target_directory(self.request, 'repo-id', '/missing')

        self.assertEqual(target_dir, '/')
        self.assertEqual(reason, 'not_found')
        mock_get_dir.assert_called_once_with('repo-id', '/missing')

    @patch('seahub.ai.utils.check_folder_permission', return_value='rw')
    def test_unspecified_directory_uses_root(self, mock_permission):
        target_dir, reason = resolve_sdoc_target_directory(self.request, 'repo-id', None)

        self.assertEqual(target_dir, '/')
        self.assertEqual(reason, 'not_specified')
