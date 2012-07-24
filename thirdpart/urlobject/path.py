# -*- coding: utf-8 -*-

import posixpath
import urllib
import urlparse


class Root(object):

    """A descriptor which always returns the root path."""

    def __get__(self, instance, cls):
        return cls('/')


class URLPath(unicode):

    root = Root()

    def __repr__(self):
        return 'URLPath(%r)' % (unicode(self),)

    @classmethod
    def join_segments(cls, segments, absolute=True):
        """Create a :class:`URLPath` from an iterable of segments."""
        path = cls('/')
        for segment in segments:
            path = path.add_segment(segment)
        return path

    @property
    def segments(self):
        """
        Split this path into (decoded) segments.

            >>> URLPath(u'/a/b/c').segments
            (u'a', u'b', u'c')

        Non-leaf nodes will have a trailing empty string, and percent encodes
        will be decoded:

            >>> URLPath(u'/a%20b/c%20d/').segments
            (u'a b', u'c d', u'')
        """
        segments = tuple(map(path_decode, self.split('/')))
        if segments[0] == u'':
            return segments[1:]
        return segments

    @property
    def parent(self):
        """
        The parent of this node.

            >>> URLPath(u'/a/b/c').parent
            URLPath(u'/a/b/')
            >>> URLPath(u'/foo/bar/').parent
            URLPath(u'/foo/')
        """
        if self.is_leaf:
            return self.relative('.')
        return self.relative('..')

    @property
    def is_leaf(self):
        """
        Is this path a leaf node?

            >>> URLPath(u'/a/b/c').is_leaf
            True
            >>> URLPath(u'/a/b/').is_leaf
            False
        """
        return self and self.segments[-1] != u''

    @property
    def is_relative(self):
        """
        Is this path relative?

            >>> URLPath(u'a/b/c').is_relative
            True
            >>> URLPath(u'/a/b/c').is_relative
            False
        """
        return self[0] != u'/'

    @property
    def is_absolute(self):
        """
        Is this path absolute?

            >>> URLPath(u'a/b/c').is_absolute
            False
            >>> URLPath(u'/a/b/c').is_absolute
            True
        """
        return self[0] == u'/'

    def relative(self, rel_path):
        """
        Resolve a relative path against this one.

            >>> URLPath(u'/a/b/c').relative('.')
            URLPath(u'/a/b/')
            >>> URLPath(u'/a/b/c').relative('d')
            URLPath(u'/a/b/d')
            >>> URLPath(u'/a/b/c').relative('../d')
            URLPath(u'/a/d')
        """
        return type(self)(urlparse.urljoin(self, rel_path))

    def add_segment(self, segment):
        u"""
        Add a segment to this path.

            >>> URLPath(u'/a/b/').add_segment('c')
            URLPath(u'/a/b/c')

        Non-ASCII and reserved characters (including slashes) will be encoded:

            >>> URLPath(u'/a/b/').add_segment(u'dé/f')
            URLPath(u'/a/b/d%C3%A9%2Ff')
        """
        return type(self)(posixpath.join(self, path_encode(segment)))

    def add(self, path):
        u"""
        Add a partial path to this one.

        The only difference between this and :meth:`add_segment` is that slash
        characters will not be encoded, making it suitable for adding more than
        one path segment at a time:

            >>> URLPath(u'/a/b/').add(u'dé/f/g')
            URLPath(u'/a/b/d%C3%A9/f/g')
        """
        return type(self)(posixpath.join(self, path_encode(path, safe='/')))


def path_encode(string, safe=''):
    return urllib.quote(string.encode('utf-8'), safe=safe)

def path_decode(string):
    return urllib.unquote(string).decode('utf-8')
