from signals import repo_created, repo_deleted
from handlers import repo_created_cb, repo_deleted_cb

repo_created.connect(repo_created_cb)
repo_deleted.connect(repo_deleted_cb)
