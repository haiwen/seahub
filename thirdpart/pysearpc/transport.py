class SearpcTransport(object):
    """
    A transport is repsonsible to send the serialized request to the
    server, and get back the raw response from the server.
    """
    def connect(self):
        raise NotImplementedError

    def send(self, service_name, request_str):
        raise NotImplementedError
