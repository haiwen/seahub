# Copyright (c) 2012-2016 Seafile Ltd.
from signals import repo_created, repo_deleted
from handlers import repo_created_cb, repo_deleted_cb

repo_created.connect(repo_created_cb)
repo_deleted.connect(repo_deleted_cb)

try:
    # ../conf/seahub_settings.py
    from seahub_settings import repo_created_callback
    repo_created.connect(repo_created_callback)
except ImportError:
    pass
