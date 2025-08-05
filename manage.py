#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "seahub.settings")

    from django.core.management import execute_from_command_line
    from django.conf import settings
    
    if not settings.configured:
        import django
        django.setup()
    
    execute_from_command_line(sys.argv)
