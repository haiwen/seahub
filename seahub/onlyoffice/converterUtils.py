from seahub.onlyoffice.settings import EXT_DOCUMENT, \
        EXT_SPREADSHEET, EXT_PRESENTATION

def getFileName(fileUri):
    ind = fileUri.rfind('/')
    return fileUri[ind+1:]

def getFilePathWithoutName(fileUri):
    ind = fileUri.rfind('/')
    return fileUri[:ind]

def getFileNameWithoutExt(fileUri):
    fn = getFileName(fileUri)
    ind = fn.rfind('.')
    return fn[:ind]

def getFileExt(fileUri):
    fn = getFileName(fileUri)
    ind = fn.rfind('.')
    return fn[ind:].lower()

def getFileType(fileUri):
    ext = getFileExt(fileUri)
    if ext in EXT_DOCUMENT:
        return 'word'
    if ext in EXT_SPREADSHEET:
        return 'cell'
    if ext in EXT_PRESENTATION:
        return 'slide'

    return 'word'

def getInternalExtension(fileType):
    mapping = {
        'word': '.docx',
        'cell': '.xlsx',
        'slide': '.pptx'
    }
    return mapping.get(fileType, None)  