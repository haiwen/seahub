import collections
import re
import urllib
import urlparse


class QueryString(unicode):

    def __repr__(self):
        return 'QueryString(%r)' % (unicode(self),)

    @property
    def list(self):
        result = []
        if not self:
            # Empty string => empty list.
            return result

        name_value_pairs = re.split(r'[\&\;]', self)
        for name_value_pair in name_value_pairs:
            # Split the pair string into a naive, encoded (name, value) pair.
            name_value = name_value_pair.split('=', 1)
            # 'param=' => ('param', None)
            if len(name_value) == 1:
                name, value = name_value + [None]
            # 'param=value' => ('param', 'value')
            # 'param=' => ('param', '')
            else:
                name, value = name_value

            name = qs_decode(name)
            if value is not None:
                value = qs_decode(value)

            result.append((name, value))
        return result

    @property
    def dict(self):
        return dict(self.list)

    @property
    def multi_dict(self):
        result = collections.defaultdict(list)
        for name, value in self.list:
            result[name].append(value)
        return dict(result)

    def add_param(self, name, value):
        if value is None:
            parameter = qs_encode(name)
        else:
            parameter = qs_encode(name) + '=' + qs_encode(value)
        if self:
            return type(self)(self + '&' + parameter)
        return type(self)(parameter)

    def add_params(self, *args, **kwargs):
        params_list = get_params_list(*args, **kwargs)
        new = self
        for name, value in params_list:
            new = new.add_param(name, value)
        return new

    def del_param(self, name):
        params = [(n, v) for n, v in self.list if n != name]
        qs = type(self)('')
        for param in params:
            qs = qs.add_param(*param)
        return qs

    def set_param(self, name, value):
        return self.del_param(name).add_param(name, value)

    def set_params(self, *args, **kwargs):
        params_list = get_params_list(*args, **kwargs)
        new = self
        for name, value in params_list:
            new = new.set_param(name, value)
        return new

    def del_params(self, params):
        deleted = set(params)
        params = [(name, value) for name, value in self.list
                  if name not in deleted]
        qs = type(self)('')
        for param in params:
            qs = qs.add_param(*param)
        return qs


qs_encode = lambda s: urllib.quote(s.encode('utf-8'))
qs_decode = lambda s: urllib.unquote(str(s).replace('+', ' ')).decode('utf-8')


def get_params_list(*args, **kwargs):
    """Turn dict-like arguments into an ordered list of pairs."""
    params = []
    if args:
        if len(args) > 1:
            raise TypeError("Expected at most 1 arguments, got 2")
        arg = args[0]
        if hasattr(arg, 'items'):
            params.extend(arg.items())
        else:
            params.extend(list(arg))
    if kwargs:
        params.extend(kwargs.items())
    return params
