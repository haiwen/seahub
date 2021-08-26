# Copyright (c) 2012-2016 Seafile Ltd.
class PayRouter(object):
    """
    A router to control all database operations on models in the
    auth application.
    """
    def db_for_read(self, model, **hints):
        """
        Attempts to read pay models go to pay_db.
        """
        if model._meta.app_label == 'pay':
            return 'pay_db'
        return None    
