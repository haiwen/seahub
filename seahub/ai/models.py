import json
import uuid

from django.db import models, transaction


class AIUsageStatistics(models.Model):
    date = models.DateField(null=True, db_index=True)
    repo_id = models.CharField(max_length=36, null=True, blank=True)
    username = models.CharField(max_length=255, null=False, db_index=True)
    repo_owner = models.CharField(max_length=255, null=True, blank=True)
    group_id = models.IntegerField(null=True, blank=True)
    org_id = models.BigIntegerField(null=True, blank=True)
    model = models.CharField(max_length=100, null=False)
    scenario = models.CharField(max_length=64, null=False, default='unknown')
    input_tokens = models.IntegerField(null=True, blank=True)
    output_tokens = models.IntegerField(null=True, blank=True)
    cost = models.FloatField()
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ai_usage_statistics'


class ChatSessionsManager(models.Manager):
    def create_session(self, repo_id, session_name, username):
        session_uuid = str(uuid.uuid4())
        session = self.model(
            repo_id=repo_id,
            session_uuid=session_uuid,
            username=username,
            session_name=session_name,
        )
        session.save()
        return session

    def get_sessions_by_repo(self, repo_id, username):
        return self.filter(repo_id=repo_id, username=username).order_by('-updated_at')

    def get_shared_sessions_by_repo(self, repo_id):
        return self.filter(repo_id=repo_id, is_shared=True).order_by('-updated_at')

    def get_session_by_uuid(self, session_uuid):
        try:
            return self.get(session_uuid=session_uuid)
        except self.model.DoesNotExist:
            return None

    def copy_session(self, source_session, username):
        """Create a user's own session from an existing session history."""
        with transaction.atomic():
            new_session = self.create_session(
                repo_id=source_session.repo_id,
                session_name=source_session.session_name,
                username=username,
            )

            source_messages = ChatMessages.objects.get_messages_by_session(source_session.session_uuid)
            if source_messages:
                ChatMessages.objects.bulk_create([
                    ChatMessages(
                        session_uuid=new_session.session_uuid,
                        message_id=message.message_id,
                        role=message.role,
                        content=message.content,
                        attachments=message.attachments,
                        sources=message.sources,
                    )
                    for message in source_messages
                ])

            source_thought_processes = ChatMessageThoughtProcess.objects.filter(session_uuid=source_session.session_uuid)
            if source_thought_processes:
                ChatMessageThoughtProcess.objects.bulk_create([
                    ChatMessageThoughtProcess(
                        session_uuid=new_session.session_uuid,
                        message_id=thought_process.message_id,
                        thought_process=thought_process.thought_process,
                    )
                    for thought_process in source_thought_processes
                ])

            return new_session


class ChatSessions(models.Model):
    id = models.BigAutoField(primary_key=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    session_uuid = models.CharField(max_length=36, unique=True, db_index=True)
    username = models.CharField(max_length=255, db_index=True)
    session_name = models.CharField(max_length=255)
    is_shared = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ChatSessionsManager()

    class Meta:
        db_table = 'chat_sessions'
        indexes = [
            models.Index(fields=['repo_id', 'is_shared'], name='idx_repo_id_is_shared'),
            models.Index(fields=['updated_at'], name='idx_chat_sessions_updated_at'),
        ]

    def to_dict(self):
        return {
            'id': self.id,
            'repo_id': self.repo_id,
            'session_uuid': self.session_uuid,
            'username': self.username,
            'session_name': self.session_name,
            'is_shared': self.is_shared,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatMessageThoughtProcessManager(models.Manager):
    def create_thought_process(self, session_uuid, message_id, thought_process):
        if not thought_process:
            return None
        record = self.model(
            session_uuid=session_uuid,
            message_id=message_id,
            thought_process=json.dumps(thought_process),
        )
        record.save()
        return record

    def get_thought_process_from_session_uuid_and_message_id(self, session_uuid, message_id):
        record = self.filter(session_uuid=session_uuid, message_id=message_id).first()
        return record.to_dict()['thought_process'] if record else {}

    def get_thought_process_from_session_uuid_and_message_ids(self, session_uuid, message_ids):
        results = {}
        for record in self.filter(session_uuid=session_uuid, message_id__in=message_ids):
            results[record.message_id] = record.to_dict()['thought_process']
        return results


class ChatMessageThoughtProcess(models.Model):
    id = models.BigAutoField(primary_key=True)
    session_uuid = models.CharField(max_length=36, null=True, blank=True)
    message_id = models.CharField(max_length=4, null=True, blank=True)
    thought_process = models.TextField(null=True)

    objects = ChatMessageThoughtProcessManager()

    class Meta:
        db_table = 'chat_message_thought_process'
        unique_together = (('session_uuid', 'message_id'),)

    def to_dict(self):
        try:
            thought_process = json.loads(self.thought_process)
        except Exception:
            thought_process = {}

        return {
            'id': self.id,
            'session_uuid': self.session_uuid,
            'message_id': self.message_id,
            'thought_process': thought_process,
        }


class ChatMessagesManager(models.Manager):
    def create_message(self, session_uuid, message_id, role, content, sources='', attachments=None):
        if attachments is None:
            attachments = []
        message = self.model(
            session_uuid=session_uuid,
            message_id=message_id,
            role=role,
            content=content,
            attachments=json.dumps(attachments),
            sources=sources,
        )
        message.save()
        return message

    def get_messages_by_session(self, session_uuid):
        return self.filter(session_uuid=session_uuid).order_by('created_at')

    def get_last_message_by_session(self, session_uuid):
        return self.filter(session_uuid=session_uuid, role='assistant').order_by('-created_at').first()


class ChatMessages(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    id = models.BigAutoField(primary_key=True)
    session_uuid = models.CharField(max_length=36, null=False)
    message_id = models.CharField(max_length=4, null=True, blank=True, default=None)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField(null=True)
    attachments = models.TextField(null=True)
    sources = models.TextField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    objects = ChatMessagesManager()

    class Meta:
        db_table = 'chat_messages'
        unique_together = (('session_uuid', 'message_id', 'role'),)

    def to_dict(self):
        try:
            sources = json.loads(self.sources)
        except Exception:
            sources = self.sources
        if not isinstance(sources, list):
            sources = []

        try:
            attachments = json.loads(self.attachments)
        except Exception:
            attachments = self.attachments
        if not isinstance(attachments, list):
            attachments = []

        return {
            'id': self.id,
            'session_uuid': self.session_uuid,
            'message_id': self.message_id,
            'role': self.role,
            'content': self.content,
            'attachments': attachments,
            'sources': sources,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
