import json
import uuid

from django.db import models, transaction


class AIUsageStatistics(models.Model):
    date = models.DateField(null=True, db_index=True)
    repo_id = models.CharField(max_length=36, null=True, blank=True)
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

        extensions = []
        if self.role == 'assistant':
            try:
                review_task = ReviewTask.objects.filter(assistant_message_id=self.id).first()
            except Exception:
                review_task = None
            if review_task:
                extensions.append({'type': 'sdoc_review', 'review_task_id': str(review_task.id)})

        return {
            'id': self.id,
            'session_uuid': self.session_uuid,
            'message_id': self.message_id,
            'role': self.role,
            'content': self.content,
            'attachments': attachments,
            'sources': sources,
            'extensions': extensions,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class ReviewTask(models.Model):
    STATUS_GENERATING = 'generating'
    STATUS_REVIEW_READY = 'review_ready'
    STATUS_APPLYING = 'applying'
    STATUS_APPLIED = 'applied'
    STATUS_PERSISTED = 'persisted'
    STATUS_SAVE_PENDING = 'save_pending'
    STATUS_REJECTED = 'rejected'
    STATUS_STALE = 'stale'
    STATUS_FAILED = 'failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_session_id = models.CharField(max_length=36, db_index=True)
    assistant_message = models.OneToOneField(
        ChatMessages, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='review_task', db_column='assistant_message_id')
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    file_uuid = models.CharField(max_length=36, db_index=True)
    requester = models.CharField(max_length=255)
    approved_by = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=32, default=STATUS_GENERATING, db_index=True)
    error_code = models.CharField(max_length=64, null=True, blank=True)
    prompt = models.TextField()
    base_sdoc_version = models.BigIntegerField()
    applied_sdoc_version = models.BigIntegerField(null=True, blank=True)
    target_block_id = models.CharField(max_length=255, null=True, blank=True)
    target_text_node_id = models.CharField(max_length=255, null=True, blank=True)
    target_block_type = models.CharField(max_length=64, null=True, blank=True)
    before_leaf_text = models.TextField(null=True, blank=True)
    before_range_text = models.TextField(null=True, blank=True)
    start_offset = models.IntegerField(null=True, blank=True)
    end_offset = models.IntegerField(null=True, blank=True)
    after_text = models.TextField(null=True, blank=True)
    rationale = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_review_task'

    def to_dict(self):
        return {
            'id': str(self.id),
            'chat_session_id': self.chat_session_id,
            'assistant_message_id': self.assistant_message_id,
            'status': self.status,
            'error_code': self.error_code,
            'base_sdoc_version': self.base_sdoc_version,
            'applied_sdoc_version': self.applied_sdoc_version,
            'target_block_id': self.target_block_id,
            'target_text_node_id': self.target_text_node_id,
            'target_block_type': self.target_block_type,
            'before_leaf_text': self.before_leaf_text,
            'before_range_text': self.before_range_text,
            'start_offset': self.start_offset,
            'end_offset': self.end_offset,
            'after_text': self.after_text,
            'rationale': self.rationale,
            'approved_by': self.approved_by,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


def ensure_review_tables():
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS `ai_review_task` (
              `id` char(36) NOT NULL,
              `chat_session_id` varchar(36) NOT NULL,
              `assistant_message_id` bigint(20) NULL,
              `repo_id` varchar(36) NOT NULL,
              `path` longtext NOT NULL,
              `file_uuid` varchar(36) NOT NULL,
              `requester` varchar(255) NOT NULL,
              `approved_by` varchar(255) NULL,
              `status` varchar(32) NOT NULL,
              `error_code` varchar(64) NULL,
              `prompt` longtext NOT NULL,
              `base_sdoc_version` bigint(20) NOT NULL,
              `applied_sdoc_version` bigint(20) NULL,
              `target_block_id` varchar(255) NULL,
              `target_text_node_id` varchar(255) NULL,
              `target_block_type` varchar(64) NULL,
              `before_leaf_text` longtext NULL,
              `before_range_text` longtext NULL,
              `start_offset` int(11) NULL,
              `end_offset` int(11) NULL,
              `after_text` longtext NULL,
              `rationale` longtext NULL,
              `created_at` datetime(6) NOT NULL,
              `updated_at` datetime(6) NOT NULL,
              PRIMARY KEY (`id`),
              UNIQUE KEY `ai_review_task_assistant_message_id` (`assistant_message_id`),
              KEY `ai_review_task_chat_session_id` (`chat_session_id`),
              KEY `ai_review_task_repo_id` (`repo_id`),
              KEY `ai_review_task_file_uuid` (`file_uuid`),
              KEY `ai_review_task_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ''')
