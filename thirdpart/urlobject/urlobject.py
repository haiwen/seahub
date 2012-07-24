import urlparse

from netloc import Netloc
from path import URLPath, path_encode, path_decode
from ports import DEFAULT_PORTS
from query_string import QueryString


class URLObject(unicode):

    """
    A URL.

    This class contains properties and methods for accessing and modifying the
    constituent components of a URL. :class:`URLObject` instances are
    immutable, as they derive from the built-in ``unicode``, and therefore all
    methods return *new* objects; you need to consider this when using
    :class:`URLObject` in your own code.
    """

    def __repr__(self):
        return 'URLObject(%r)' % (unicode(self),)

    @property
    def scheme(self):
        return urlparse.urlsplit(self).scheme
    def with_scheme(self, scheme):
        return self.__replace(scheme=scheme)

    @property
    def netloc(self):
        return Netloc(urlparse.urlsplit(self).netloc)
    def with_netloc(self, netloc):
        return self.__replace(netloc=netloc)

    @property
    def username(self):
        return self.netloc.username
    def with_username(self, username):
        return self.with_netloc(self.netloc.with_username(username))
    def without_username(self):
        return self.with_netloc(self.netloc.without_username())

    @property
    def password(self):
        return self.netloc.password
    def with_password(self, password):
        return self.with_netloc(self.netloc.with_password(password))
    def without_password(self):
        return self.with_netloc(self.netloc.without_password())

    @property
    def hostname(self):
        return self.netloc.hostname
    def with_hostname(self, hostname):
        return self.with_netloc(self.netloc.with_hostname(hostname))

    @property
    def port(self):
        return self.netloc.port
    def with_port(self, port):
        return self.with_netloc(self.netloc.with_port(port))
    def without_port(self):
        return self.with_netloc(self.netloc.without_port())

    @property
    def auth(self):
        return self.netloc.auth
    def with_auth(self, *auth):
        return self.with_netloc(self.netloc.with_auth(*auth))
    def without_auth(self):
        return self.with_netloc(self.netloc.without_auth())

    @property
    def default_port(self):
        """
        The destination port number for this URL.

        If no port number is explicitly given in the URL, this will return the
        default port number for the scheme if one is known, or ``None``. The
        mapping of schemes to default ports is defined in
        :const:`urlobject.ports.DEFAULT_PORTS`.
        """
        port = urlparse.urlsplit(self).port
        if port is not None:
            return port
        return DEFAULT_PORTS.get(self.scheme)

    @property
    def path(self):
        return URLPath(urlparse.urlsplit(self).path)
    def with_path(self, path):
        return self.__replace(path=path)

    @property
    def root(self):
        return self.with_path('/')

    @property
    def parent(self):
        return self.with_path(self.path.parent)

    @property
    def is_leaf(self):
        return self.path.is_leaf

    def add_path_segment(self, segment):
        return self.with_path(self.path.add_segment(segment))

    def add_path(self, partial_path):
        return self.with_path(self.path.add(partial_path))

    @property
    def query(self):
        return QueryString(urlparse.urlsplit(self).query)
    def with_query(self, query):
        return self.__replace(query=query)
    def without_query(self):
        return self.__replace(query='')

    @property
    def query_list(self):
        return self.query.list

    @property
    def query_dict(self):
        return self.query.dict

    @property
    def query_multi_dict(self):
        return self.query.multi_dict

    def add_query_param(self, name, value):
        return self.with_query(self.query.add_param(name, value))
    def add_query_params(self, *args, **kwargs):
        return self.with_query(self.query.add_params(*args, **kwargs))

    def set_query_param(self, name, value):
        return self.with_query(self.query.set_param(name, value))
    def set_query_params(self, *args, **kwargs):
        return self.with_query(self.query.set_params(*args, **kwargs))

    def del_query_param(self, name):
        return self.with_query(self.query.del_param(name))
    def del_query_params(self, params):
        return self.with_query(self.query.del_params(params))

    @property
    def fragment(self):
        return path_decode(urlparse.urlsplit(self).fragment)
    def with_fragment(self, fragment):
        return self.__replace(fragment=path_encode(fragment))
    def without_fragment(self):
        return self.__replace(fragment='')

    def relative(self, other):
        """Resolve another URL relative to this one."""
        # Relative URL resolution involves cascading through the properties
        # from left to right, replacing
        other = type(self)(other)
        if other.scheme:
            return other
        elif other.netloc:
            return other.with_scheme(self.scheme)
        elif other.path:
            return other.with_scheme(self.scheme).with_netloc(self.netloc) \
                    .with_path(self.path.relative(other.path))
        elif other.query:
            return other.with_scheme(self.scheme).with_netloc(self.netloc) \
                    .with_path(self.path)
        elif other.fragment:
            return other.with_scheme(self.scheme).with_netloc(self.netloc) \
                    .with_path(self.path).with_query(self.query)
        # Empty string just removes fragment; it's treated as a path meaning
        # 'the current location'.
        return self.without_fragment()

    def __replace(self, **replace):
        """Replace a field in the ``urlparse.SplitResult`` for this URL."""
        return type(self)(urlparse.urlunsplit(
            urlparse.urlsplit(self)._replace(**replace)))


if not hasattr(urlparse, 'ResultMixin'):
    def _replace(split_result, **replace):
        return urlparse.SplitResult(
            **dict((attr, replace.get(attr, getattr(split_result, attr)))
                for attr in ('scheme', 'netloc', 'path', 'query', 'fragment')))
    urlparse.BaseResult._replace = _replace
    del _replace
