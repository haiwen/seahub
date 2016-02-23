def get_file_size_unit(unit_type):
    """
    File size unit according to https://en.wikipedia.org/wiki/Kibibyte.
    """
    table = {
        # decimal
        'kb': 10 ** 3,
        'mb': 10 ** 6,
        'gb': 10 ** 9,
        'tb': 10 ** 12,
        'pb': 10 ** 15,
        # binary
        'kib': 1 << 10,
        'mib': 1 << 20,
        'gib': 1 << 30,
        'tib': 1 << 40,
        'pib': 1 << 50,
    }

    unit_type = unit_type.lower()
    if unit_type not in table.keys():
        raise TypeError('Invalid unit type')

    return table.get(unit_type)
