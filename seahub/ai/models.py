from django.db import models


class StatsAIByTeam(models.Model):
    org_id = models.BigIntegerField(null=False)
    month = models.DateField(null=False, db_index=True)
    model = models.CharField(max_length=100, null=False)
    input_tokens = models.IntegerField()
    output_tokens = models.IntegerField()
    cost = models.FloatField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = 'stats_ai_by_team'
        unique_together = (('org_id', 'month', 'model'),)


class StatsAIByOwner(models.Model):
    username = models.CharField(max_length=255, null=False)
    month = models.DateField(null=False, db_index=True)
    model = models.CharField(max_length=100, null=False)
    input_tokens = models.IntegerField()
    output_tokens = models.IntegerField()
    cost = models.FloatField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = 'stats_ai_by_owner'
        unique_together = (('username', 'month', 'model'),)
