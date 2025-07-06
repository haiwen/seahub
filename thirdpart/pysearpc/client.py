import json
from .common import SearpcError

def _fret_int(ret_str):
    try:
        dicts = json.loads(ret_str)
    except:
        raise SearpcError('Invalid response format')

    if 'err_code' in dicts:
        raise SearpcError(dicts['err_msg'])

    if 'ret' in dicts:
        return dicts['ret']
    else:
        raise SearpcError('Invalid response format')

def _fret_string(ret_str):
    try:
        dicts = json.loads(ret_str)
    except:
        raise SearpcError('Invalid response format')

    if 'err_code' in dicts:
        raise SearpcError(dicts['err_msg'])

    if 'ret' in dicts:
        return dicts['ret']
    else:
        raise SearpcError('Invalid response format')

class _SearpcObj(object):
    '''A compact class to emulate gobject.GObject
    '''
    def __init__(self, dicts):
        new_dict = {}
        for key in dicts:
            value = dicts[key]
            # replace hyphen with with underline
            new_key = key.replace('-', '_')
            new_dict[new_key] = value
        # For compatibility with old usage peer.props.name
        self.props = self
        self._dict = new_dict

    def __getattr__(self, key):
        try:
            return self._dict[key]
        except:
            return None

class SearpcObjEncoder(json.JSONEncoder):
    def default(self, obj):
        if not isinstance(obj, _SearpcObj):
            return super(SearpcObjEncoder, self).default(obj)
        return obj._dict

def _fret_obj(ret_str):
    try:
        dicts = json.loads(ret_str)
    except:
        raise SearpcError('Invalid response format')

    if 'err_code' in dicts:
        raise SearpcError(dicts['err_msg'])

    if dicts['ret']:
        return _SearpcObj(dicts['ret'])
    else:
        return None

def _fret_objlist(ret_str):
    try:
        dicts = json.loads(ret_str)
    except:
        raise SearpcError('Invalid response format')

    if 'err_code' in dicts:
        raise SearpcError(dicts['err_msg'])

    l = []
    if dicts['ret']:
        for elt in dicts['ret']:
            l.append(_SearpcObj(elt))

    return l

def _fret_json(ret_str):
    try:
        dicts = json.loads(ret_str)
    except:
        raise SearpcError('Invalid response format')

    if 'err_code' in dicts:
        raise SearpcError(dicts['err_msg'])

    if dicts['ret']:
        return dicts['ret']
    else:
        return None

def searpc_func(ret_type, param_types):

    def decorate(func):
        if ret_type == "void":
            fret = None
        elif ret_type == "object":
            fret = _fret_obj
        elif ret_type == "objlist":
            fret = _fret_objlist
        elif ret_type == "int":
            fret = _fret_int
        elif ret_type == "int64":
            fret = _fret_int
        elif ret_type == "string":
            fret = _fret_string
        elif ret_type == "json":
            fret = _fret_json
        else:
            raise SearpcError('Invial return type')

        def newfunc(self, *args):
            array = [func.__name__] + list(args)
            fcall_str = json.dumps(array)
            ret_str = self.call_remote_func_sync(fcall_str)
            if fret:
                return fret(ret_str)
        
        # 添加属性以支持动态方法复制
        newfunc.ret_type = ret_type
        newfunc.arg_types = param_types
        newfunc.__name__ = func.__name__

        return newfunc

    return decorate


class SearpcClient(object):

    def call_remote_func_sync(self, fcall_str):
        raise NotImplementedError()
