from django.core.cache import cache

from seahub.notifications.models import Notification

def refresh_cache():
    """
    Function to be called when change primary notification.
    """
    cache.set('CUR_TOPINFO', Notification.objects.all().filter(primary=1),
              24*60*60)
    
