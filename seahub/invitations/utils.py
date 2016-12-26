# Copyright (c) 2012-2016 Seafile Ltd.
import re

from django.conf import settings

def block_accepter(accepter):
    for pattern in settings.INVITATION_ACCEPTER_BLACKLIST:
        if pattern.startswith('*'):
            if accepter.endswith(pattern[1:]):
                return True
        elif accepter == pattern:
            return True
        else:
            compiled_pattern = re.compile(pattern)
            if compiled_pattern.search(accepter) is not None:
                return True

    return False
