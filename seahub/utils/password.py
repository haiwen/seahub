import re

from constance import config

MIDDLE_STRENGTH = 4
STRONG_STRENGTH = 6
SUPER_STRONG_STRENGTH = 8

PASSWORD_STRENGTH_REQUIREMENTS = {
    MIDDLE_STRENGTH: {
        'min_len': 8,
        'char_types': ['up', 'lower', 'number']
    },
    STRONG_STRENGTH: {
        'min_len': 12,
        'char_types': ['up', 'lower', 'number', 'special']
    }
}


def evaluate_password_strength(password):
    strength = 0
    length = len(password)
    has_uppercase = bool(re.search('[A-Z]', password))
    has_lowercase = bool(re.search('[a-z]', password))
    has_numbers = bool(re.search('\d', password))
    has_special_chars = bool(re.search(r'[~!@#$%^&*()_\-+=<>?:"{}|,./;\'\\]', password))

    # judge by length
    if length >= 16:
        strength += 4
    elif length >= 12:
        strength += 3
    elif length >= 8:
        strength += 2
    elif length >= 6:
        strength += 1

    # judge by char type
    if has_uppercase:
        strength += 1
    if has_lowercase:
        strength += 1
    if has_numbers:
        strength += 1
    if has_special_chars:
        strength += 1

    return strength


def is_password_strength_valid(password):
    strength = evaluate_password_strength(password)
    if config.USER_STRONG_PASSWORD_REQUIRED:
        return strength >= STRONG_STRENGTH
    return strength >= MIDDLE_STRENGTH


def get_password_strength_requirements():
    if config.USER_STRONG_PASSWORD_REQUIRED:
        return PASSWORD_STRENGTH_REQUIREMENTS.get(STRONG_STRENGTH)
    return PASSWORD_STRENGTH_REQUIREMENTS.get(MIDDLE_STRENGTH)
