import posixpath


def is_valid_asset_filename(filename):
    """Only accept a single, unambiguous attachment filename."""
    return (isinstance(filename, str) and bool(filename)
            and filename not in ('.', '..')
            and not any(char in filename for char in ('/', '\\', '%'))
            and not any(ord(char) < 32 or ord(char) == 127 for char in filename))


def get_asset_path(parent_path, filename):
    if not is_valid_asset_filename(filename):
        return None
    parent_path = posixpath.normpath(parent_path)
    path = posixpath.normpath(posixpath.join(parent_path, filename))
    if posixpath.dirname(path) != parent_path:
        return None
    return path
