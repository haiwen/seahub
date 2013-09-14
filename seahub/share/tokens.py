import random
from datetime import date
from datetime import datetime as dt
from django.conf import settings
from django.utils.http import int_to_base36, base36_to_int

from settings import ANONYMOUS_SHARE_LINK_TIMEOUT

class AnonymousShareTokenGenerator(object):
    """
    Strategy object used to generate and check tokens for the repo anonymous
    share mechanism.
    """
    def make_token(self):
        """
        Returns a token that can be used once to do a anonymous share for repo.
        """
        return self._make_token_with_timestamp(self._num_days(self._today()))

    def check_token(self, token):
        """
        Check that a anonymous share token is valid.
        """
        # Parse the token
        try:
            ts_b36, hash = token.split("-")
        except ValueError:
            return False

        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False

        # Check the timestamp is within limit
        if (self._num_days(self._today()) - ts) > ANONYMOUS_SHARE_LINK_TIMEOUT:
            return False

        return True

    def get_remain_time(self, token):
        """
        Get token remain time.
        """
        try:
            ts_b36, hash = token.split("-")
        except ValueError:
            return None

        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return None
        
        days = ANONYMOUS_SHARE_LINK_TIMEOUT - (self._num_days(self._today()) - ts)
        if days < 0:
            return None
        
        now = dt.now()
        tomorrow = dt(now.year, now.month, now.day+1)

        return (tomorrow - now).seconds + days * 24 * 60 * 60

    def _make_token_with_timestamp(self, timestamp):
        # timestamp is number of days since 2001-1-1.  Converted to
        # base 36, this gives us a 3 digit string until about 2121
        ts_b36 = int_to_base36(timestamp)

        # We limit the hash to 20 chars to keep URL short
        import datetime
        import hashlib
        now = datetime.datetime.now()
        hash = hashlib.sha1(settings.SECRET_KEY +
                               unicode(random.randint(0, 999999)) +
                               now.strftime('%Y-%m-%d %H:%M:%S') +
                               unicode(timestamp)).hexdigest()[::2]
        
        return "%s-%s" % (ts_b36, hash)

    def _num_days(self, dt):
        return (dt - date(2001,1,1)).days

    def _today(self):
        # Used for mocking in tests
        return date.today()

anon_share_token_generator = AnonymousShareTokenGenerator()
