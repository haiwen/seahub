from django.db import models


class WPSFileVersionManager(models.Manager):

    def get_version(self, repo_id, path):
        try:
            instance = self.get(repo_id=repo_id, path=path)
        except WPSFileVersion.DoesNotExist:
            instance, created = self.create_or_increment_version(repo_id, path)

        return instance.version

    def create_or_increment_version(self, repo_id, path):
        instance, created = self.get_or_create(
            repo_id=repo_id,
            path=path,
            defaults={'version': 1}
        )

        if not created:
            instance.version += 1
            instance.save()

        return instance, created


class WPSFileVersion(models.Model):
    repo_id = models.CharField(max_length=36)
    path = models.CharField(max_length=512)
    version = models.IntegerField(default=1)

    objects = WPSFileVersionManager()

    class Meta:
        db_table = 'wps_file_version'
        unique_together = ['repo_id', 'path']
        indexes = [
            models.Index(fields=['repo_id', 'path']),
        ]

    def __str__(self):
        return f"{self.repo_id}:{self.path} (v{self.version})"
