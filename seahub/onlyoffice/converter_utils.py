from seahub.onlyoffice.settings import EXT_DOCUMENT, \
        EXT_SPREADSHEET, EXT_PRESENTATION


def get_file_name(file_uri):
    ind = file_uri.rfind('/')
    return file_uri[ind+1:]


def get_file_path_without_mame(file_uri):
    ind = file_uri.rfind('/')
    return file_uri[:ind]


def get_file_name_without_ext(file_uri):
    fn = get_file_name(file_uri)
    ind = fn.rfind('.')
    return fn[:ind]


def get_file_ext(file_uri):
    fn = get_file_name(file_uri)
    ind = fn.rfind('.')
    return fn[ind:].lower()


def get_file_type(file_uri):
    ext = get_file_ext(file_uri)
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
