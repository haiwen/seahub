from . import settings, utils


class Config(object):
    """
    The global config wrapper that handles the backend.
    """
    def __init__(self):
        super(Config, self).__setattr__('_backend',
                                        utils.import_module_attr(settings.BACKEND)())

    def __getattr__(self, key):
        try:
            if not len(settings.CONFIG[key]) in (2, 3):
                raise AttributeError(key)
            default = settings.CONFIG[key][0]
        except KeyError:
            raise AttributeError(key)

        if not settings.ENABLED:
            return default

        result = self._backend.get(key)
        if result is None:
            result = default
            # Do not set default value to db/redis when there is no result.
            # setattr(self, key, default)
            return result
        return result

    def __setattr__(self, key, value):
        if key not in settings.CONFIG:
            raise AttributeError(key)
        self._backend.set(key, value)

    def __dir__(self):
        return settings.CONFIG.keys()
