from django.db import models

class AnonymousShare(models.Model):
    repo_owner = models.EmailField(max_length=255)
    repo_id = models.CharField(max_length=36)
    anonymous_email = models.EmailField(max_length=255)
    token = models.CharField(max_length=25, unique=True)
        
