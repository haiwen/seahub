from django.conf import settings
from django.core.management.base import BaseCommand
from django_cas.models import SessionServiceTicket


class Command(BaseCommand):
    help = "Purges CAS session - service ticket mappings not matching any session."
    
    def handle_noargs(self, **options):
        """Purges Session Service Tickets with non-existing session keys."""

        verbose = True if options.get('verbosity') in ['2', '3'] else False
        session_engine = __import__(name=settings.SESSION_ENGINE, fromlist=['SessionStore'])
        SessionStore = getattr(session_engine, 'SessionStore')
        s = SessionStore()
        for sst in SessionServiceTicket.objects.all():
            if not s.exists(sst.session_key):
                if verbose:
                    print("deleting session service ticket for session: " + sst.session_key)
                sst.delete()
