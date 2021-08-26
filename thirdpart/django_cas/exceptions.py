""" Django CAS 2.0 authentication backend """

class CasTicketException(Exception):
    def __init__(self, error):
        self.error = error
    
    def __str__(self):
        return repr(self.error)
