from seahub.onlyoffice.settings import EXT_DOCUMENT, \
        EXT_SPREADSHEET, EXT_PRESENTATION


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
    if ext in EXT_DOCUMENT:
        return 'word'
    if ext in EXT_SPREADSHEET:
        return 'cell'
    if ext in EXT_PRESENTATION:
        return 'slide'

    return 'word'


def get_internal_extension(file_type):
    mapping = {
        'word': '.docx',
        'cell': '.xlsx',
        'slide': '.pptx'
    }
    return mapping.get(file_type, None)
