from seahub.onlyoffice.settings import ONLYOFFICE_EXT_WORD, \
        ONLYOFFICE_EXT_CELL, ONLYOFFICE_EXT_SLIDE


def get_file_name(file_path):
    ind = file_path.rfind('/')
    return file_path[ind+1:]


def get_file_name_without_ext(file_path):
    fn = get_file_name(file_path)
    ind = fn.rfind('.')
    return fn[:ind]


def get_file_ext(file_path):
    fn = get_file_name(file_path)
    ind = fn.rfind('.')
    return fn[ind:].lower()


def get_file_type(file_path):
    ext = get_file_ext(file_path)
    if ext in ONLYOFFICE_EXT_WORD:
        return 'word'
    if ext in ONLYOFFICE_EXT_CELL:
        return 'cell'
    if ext in ONLYOFFICE_EXT_SLIDE:
        return 'slide'

    return 'word'


def get_internal_extension(file_type):
    mapping = {
        'word': '.docx',
        'cell': '.xlsx',
        'slide': '.pptx'
    }
    return mapping.get(file_type, None)
