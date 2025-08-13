# models.py
import uuid
import json
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class WorkflowStatus(models.TextChoices):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'


class NodeType(models.TextChoices):
    START = 'start'
    END = 'end'
    HTTP_REQUEST = 'http_request'
    CODE = 'code'
    IF_ELSE = 'if_else'
    VARIABLE_ASSIGNER = 'variable_assigner'
    TEMPLATE_TRANSFORM = 'template_transform'
    KNOWLEDGE_RETRIEVAL = 'knowledge_retrieval'
    ANSWER = 'answer'



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
    
    def set_graph_data(self, data):
        self.graph = json.dumps(data)
    
    def validate_graph(self): 
        """验证工作流图的有效性"""
        graph_data = self.graph_data
        if not graph_data:
            return False, None
        
        nodes = graph_data.get('nodes', [])
        edges = graph_data.get('edges', [])
        
        if not nodes:
            return False, None
        
        start_nodes = [n for n in nodes if n.get('data', {}).get('type') == 'start']
        if len(start_nodes) != 1:
            return False, None
        
        node_ids = {n['id'] for n in nodes}
        for edge in edges:
            if edge['source'] not in node_ids or edge['target'] not in node_ids:
                return False, f"node not found: {edge['source']} -> {edge['target']}"
        
        return True, True

    def to_dict(self):
        return {
            'id': str(self.id),
            'repo_id': self.repo_id,
            'name': self.name,
            'graph': self.graph,
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
    status = models.CharField(max_length=20, choices=WorkflowStatus.choices, default=WorkflowStatus.PENDING)
    triggered_from = models.CharField(max_length=36, null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    elapsed_time = models.FloatField(null=True, blank=True)
    total_steps = models.IntegerField(null=True, blank=True)
    inputs = models.TextField(null=True, blank=True)
    outputs = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'workflow_run'
    
    def __str__(self):
        return f"Run {self.workflow_id} - {self.status}"
    
    @property
    def inputs_data(self):
        if self.inputs:
            try:
                return json.loads(self.inputs)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def set_inputs_data(self, data):
        self.inputs = json.dumps(data)
    
    @property
    def outputs_data(self):
        if self.outputs:
            try:
                return json.loads(self.outputs)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def set_outputs_data(self, data):
        self.outputs = json.dumps(data)
    
    def start_execution(self):
        self.status = WorkflowStatus.RUNNING
        self.started_at = timezone.now()
        self.save()
    
    def complete_execution(self, outputs=None):
        self.status = WorkflowStatus.COMPLETED
        self.finished_at = timezone.now()
        if self.started_at:
            self.elapsed_time = (self.finished_at - self.started_at).total_seconds()
        if outputs:
            self.set_outputs_data(outputs)
        self.save()
    
    def fail_execution(self, error_msg):
        self.status = WorkflowStatus.FAILED
        self.error = error_msg
        self.finished_at = timezone.now()
        if self.started_at:
            self.elapsed_time = (self.finished_at - self.started_at).total_seconds()
        self.save()


class WorkflowNodeExecution(models.Model):
    repo_id = models.CharField(max_length=36)
    workflow_id = models.CharField(max_length=36)
    workflow_run_id = models.CharField(max_length=36)
    node_type = models.CharField(max_length=36, choices=NodeType.choices)
    node_id = models.CharField(max_length=36)
    title = models.CharField(max_length=255)
    inputs = models.TextField(null=True, blank=True)
    outputs = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=WorkflowStatus.choices, default=WorkflowStatus.PENDING)
    elapsed_time = models.FloatField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'workflow_node_executions'
    
    def __str__(self):
        return f"{self.title} ({self.node_type}) - {self.status}"
    
    @property
    def inputs_data(self):
        if self.inputs:
            try:
                return json.loads(self.inputs)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def set_inputs_data(self, data):
        self.inputs = json.dumps(data, ensure_ascii=False)
    
    @property
    def outputs_data(self):
        if self.outputs:
            try:
                return json.loads(self.outputs)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def set_outputs_data(self, data):
        self.outputs = json.dumps(data, ensure_ascii=False)
    
    def start_execution(self):
        self.status = WorkflowStatus.RUNNING
        self.started_at = timezone.now()
        self.save()
    
    def complete_execution(self, outputs=None):
        self.status = WorkflowStatus.COMPLETED
        self.finished_at = timezone.now()
        if self.started_at:
            self.elapsed_time = (self.finished_at - self.started_at).total_seconds()
        if outputs:
            self.set_outputs_data(outputs)
        self.save()
    
    def fail_execution(self, error_msg):
        self.status = WorkflowStatus.FAILED
        self.error = error_msg
        self.finished_at = timezone.now()
        if self.started_at:
            self.elapsed_time = (self.finished_at - self.started_at).total_seconds()
        self.save()
