from django.utils.translation import gettext as _
from django.template.defaultfilters import filesizeformat


def file_type_error_msg(ext, allowed_file_exts):
    if isinstance(allowed_file_exts, tuple) or isinstance(allowed_file_exts, list):
        allowed_file_exts = ", ".join(allowed_file_exts)
    return _("%(ext)s is an invalid file extension. Authorized extensions are " + 
             ": %(valid_exts_list)s") % {'ext' : ext, 
                                        'valid_exts_list' : allowed_file_exts}

def file_size_error_msg(size, max_size):
    return _("Your file is too big (%(size)s), the maximum allowed size is " +
             "%(max_valid_size)s") % { 'size' : filesizeformat(size),
                                     'max_valid_size' : filesizeformat(max_size)}
