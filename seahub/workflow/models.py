import json
from django.db import models

class Workflow(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    name = models.CharField(max_length=255)
    graph = models.TextField()
    trigger_from = models.CharField(max_length=36, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255)
    updated_by = models.CharField(max_length=255, null=True, blank=True)
    is_valid = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'workflows'
    
    @property
    def graph_data(self):
        if self.graph:
            try:
                return json.loads(self.graph)
            except json.JSONDecodeError:
                return {}
        return {}
    

    def to_dict(self):
        return {
            'id': str(self.id),
            'repo_id': self.repo_id,
            'name': self.name,
            'graph_data': self.graph_data,
            'trigger_from': self.trigger_from,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'is_valid': self.is_valid,
        }

class WorkflowRun(models.Model):
    workflow_id = models.CharField(max_length=36)
    repo_id = models.CharField(max_length=36)
    graph = models.TextField()
    status = models.CharField(max_length=20)
    triggered_from = models.CharField(max_length=36)
    elapsed_time = models.FloatField(null=True, blank=True)
    total_steps = models.IntegerField(null=True, blank=True)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'workflow_run'
