# coding: UTF-8

import os
import tempfile
import logging
import re
import chardet
import json
from zipfile import ZipFile
from io import BytesIO

from seahub_io.utils import run_and_wait
from seahub_io.seasearch.utils.constants import text_suffixes, office_suffixes, ZERO_OBJ_ID

from seafobj import fs_mgr

logger = logging.getLogger('seasearch')

class ZipString(ZipFile):
    def __init__(self, content):
        ZipFile.__init__(self, BytesIO(content))


def extract_pdf_text(content):
    temp_pdf = tempfile.NamedTemporaryFile()
    temp_txt = tempfile.NamedTemporaryFile()
    try:
        pdf_name = temp_pdf.name
        txt_name = temp_txt.name
        with open(pdf_name, 'wb') as output:
            output.write(content)

        cmd = ['timeout', str(5 * 60), 'pdftotext', pdf_name, txt_name]
        if run_and_wait(cmd) != 0:
            content = None
        else:
            with open(txt_name, 'rb') as fp:
                content = fp.read()

        return content
    except Exception as e:
        logger.warning('error when extracting pdf: %s', e)
        return None
    finally:
        temp_pdf.close()
        temp_txt.close()

def extract_docx_text(content):
    doc = ZipString(content)
    content = doc.read('word/document.xml')
    cleaned = re.sub('<(.|\n)*?>', ' ', content.decode())
    return cleaned.encode()

def extract_pptx_text(content):
    doc = ZipString(content)
    unpacked = doc.infolist()
    slides = []
    for item in unpacked:
        if item.orig_filename.startswith('ppt/slides') or item.orig_filename.startswith('ppt/notesSlides'):
            if item.orig_filename.endswith('xml'):
                slides.append(doc.read(item.orig_filename).decode())

    content = ''.join(slides)
    cleaned = re.sub('<(.|\n)*?>', ' ', content)
    return cleaned.encode()


def extract_xlsx_text(content):
    doc = ZipString(content)
    unpacked = doc.infolist()
    slides = []
    for item in unpacked:
        if item.orig_filename.startswith('xl/worksheets') or item.orig_filename.startswith('xl/sharedStrings.xml'):
            if item.orig_filename.endswith('xml'):
                slides.append(doc.read(item.orig_filename).decode())

    content = ''.join(slides)
    cleaned = re.sub('<(.|\n)*?>', ' ', content)
    return cleaned.encode()


def extract_odf_text(content):
    doc = ZipString(content)
    content = doc.read('content.xml')
    cleaned = re.sub('<(.|\n)*?>', ' ', content.decode())
    return cleaned.encode()


def extract_sdoc_text(content):
    data = json.loads(content)
    texts = []

    def extract_text(node):
        children = node.get('children', [])
        for item in children:
            text = item.get('text', '')
            if text and text.strip():
                texts.append(text.strip())
            extract_text(item)

    # Ensure start with the 'elements' part of the data
    for element in data.get('elements', []):
        extract_text(element)

    result = ' '.join(texts)
    return result.encode()


EXTRACT_TEXT_FUNCS = {
    'docx': extract_docx_text,
    'pptx': extract_pptx_text,
    'xlsx': extract_xlsx_text,
    'pdf': extract_pdf_text,
    'odt': extract_odf_text,
    'ods': extract_odf_text,
    'odp': extract_odf_text,
    'sdoc': extract_sdoc_text,
}

EXTRACT_TEXT_FUNCS.update(dict([(suffix, lambda content, *args: content) for suffix in text_suffixes]))

def get_file_suffix(path):
    try:
        name = os.path.basename(path)
        suffix = os.path.splitext(name)[1][1:]
        if suffix:
            return suffix.lower()
        return None
    except:
        return None


def is_text_file(path):
    suffix = get_file_suffix(path)
    if not suffix:
        return False

    if suffix in text_suffixes:
        return True

    return False

def is_office_pdf(path):
    suffix = get_file_suffix(path)
    if not suffix:
        return False

    if suffix in office_suffixes:
        return True

    return False

def is_text_office(filename):
    return is_text_file(filename) or is_office_pdf(filename)

class Extractor(object):
    def __init__(self, func):
        self.func = func

    def extract(self, repo_id, version, obj_id, path):
        if obj_id == ZERO_OBJ_ID:
            return None

        f = fs_mgr.load_seafile(repo_id, version, obj_id)
        content = f.get_content()
        if not content:
            # An empty file
            return None
        try:
            logger.info('extracting %s %s...', repo_id, path)
            content = self.func(content)
            logger.info('successfully extracted %s', path)
        except Exception as e:
            logger.warning('failed to extract %s: %s', path, e)
            return None

        return self.fix_encoding(repo_id, path, content)

    def fix_encoding(self, repo_id, path, content):
        if not content:
            return None
        enc = chardet.detect(content[:4000]).get('encoding', None)
        if not enc:
            logger.warning('%s %s: encoding is unknown', repo_id, path)
            return None
        enc = enc.lower()

        try:
            content = content.decode(enc).encode('utf-8').decode('utf-8')
        except Exception as e:
            logger.warning('%s: %s failed to trans code from %s to utf-8, because: %s', repo_id, path, enc, e)
            return None

        return content


class ExtractorFactory(object):
    @classmethod
    def get_extractor(cls, filename):
        suffix = get_file_suffix(filename)
        func = EXTRACT_TEXT_FUNCS.get(suffix, None)
        if not func:
            return None
        return Extractor(func)
