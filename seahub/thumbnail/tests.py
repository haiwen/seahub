# Copyright (c) 2012-2016 Seafile Ltd.
import os
import subprocess
import tempfile
from io import BytesIO
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from seahub.thumbnail import utils


class PDFThumbnailTest(TestCase):
    def test_pdf_is_flushed_before_conversion(self):
        pdf_bytes = b'%PDF-1.4\n' + b'x' * 108527
        named_temporary_file = tempfile.NamedTemporaryFile

        def check_input(command, **kwargs):
            with open(command[command.index('-singlefile') + 1], 'rb') as source:
                self.assertEqual(source.read(), pdf_bytes)
            return b''

        with patch.object(utils.tempfile, 'NamedTemporaryFile',
                          side_effect=lambda **kwargs: named_temporary_file(
                              buffering=131072, **kwargs)), \
                patch.object(utils.subprocess, 'check_output', side_effect=check_input):
            self.assertEqual(utils.pdf_bytes_to_images(pdf_bytes, '/unused'), (True, 200))

    def test_conversion_errors(self):
        errors = [subprocess.CalledProcessError(1, 'pdftoppm'),
                  subprocess.TimeoutExpired('pdftoppm', 60)]
        for error in errors:
            with self.subTest(error=type(error).__name__), \
                    patch.object(utils.subprocess, 'check_output', side_effect=error):
                self.assertEqual(utils.pdf_bytes_to_images(b'%PDF', '/unused'), (False, 500))

    def test_page_area_limit(self):
        page_info = b'Page    1 size:  6000 x 6000 pts\n'
        with patch.object(utils, 'LARGE_PDF_SIZE_THRESHOLD', 0), \
                patch.object(utils.subprocess, 'check_output', return_value=page_info) as convert:
            self.assertEqual(utils.pdf_bytes_to_images(b'%PDF', '/unused'), (False, 400))
            self.assertEqual(convert.call_count, 1)

    def test_thumbnail_results_and_cleanup(self):
        cases = [((True, 200), (True, 200), True),
                 ((False, 500), (False, 500), False),
                 ((False, 400), (False, 400), False),
                 ((False, 500), (False, 500), True)]
        for conversion_result, expected, png_exists in cases:
            with self.subTest(result=conversion_result, png_exists=png_exists), \
                    tempfile.TemporaryDirectory() as directory:
                png_path = os.path.join(directory, '12345678.png')
                if png_exists:
                    with open(png_path, 'wb'):
                        pass
                with patch.object(utils.tempfile, 'gettempdir', return_value=directory), \
                        patch.object(utils.seafile_api, 'get_fileserver_access_token', return_value='token'), \
                        patch.object(utils, 'gen_inner_file_get_url', return_value='http://unused'), \
                        patch.object(utils.urllib.request, 'urlopen', return_value=BytesIO(b'%PDF')), \
                        patch.object(utils, 'pdf_bytes_to_images', return_value=conversion_result), \
                        patch.object(utils, '_create_thumbnail_common', return_value=(True, 200)) as thumbnail:
                    result = utils.create_pdf_thumbnails(
                        SimpleNamespace(id='repo'), '12345678abcdef', '/test.pdf', 256, '/unused', 4)
                    self.assertEqual(result, expected)
                    self.assertEqual(thumbnail.call_count, int(conversion_result[0]))
                self.assertFalse(os.path.exists(png_path))

    def test_missing_png_returns_error(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(utils.tempfile, 'gettempdir', return_value=directory), \
                patch.object(utils.seafile_api, 'get_fileserver_access_token', return_value='token'), \
                patch.object(utils, 'gen_inner_file_get_url', return_value='http://unused'), \
                patch.object(utils.urllib.request, 'urlopen', return_value=BytesIO(b'%PDF')), \
                patch.object(utils, 'pdf_bytes_to_images', return_value=(True, 200)), \
                patch.object(utils, '_create_thumbnail_common', side_effect=FileNotFoundError):
            self.assertEqual(utils.create_pdf_thumbnails(
                SimpleNamespace(id='repo'), '12345678abcdef', '/test.pdf', 256, '/unused', 4),
                (False, 500))
