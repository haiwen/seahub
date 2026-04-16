class MiddlewareMixin:

    sync_capable = True

    def __init__(self, get_response):

        if get_response is None:
            raise ValueError("get_response must be provided.")
        self.get_response = get_response
        super().__init__()

    def __repr__(self):
        return "<%s get_response=%s>" % (
            self.__class__.__qualname__,
            getattr(
                self.get_response,
                "__qualname__",
                self.get_response.__class__.__name__,
            ),
        )

    def __call__(self, request):
        response = None
        if hasattr(self, "process_request"):
            response = self.process_request(request)
        response = response or self.get_response(request)
        if hasattr(self, "process_response"):
            response = self.process_response(request, response)
        return response
