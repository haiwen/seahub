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

    def to_dict(self, review_task_by_assistant_message_id=None):
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
            if review_task_by_assistant_message_id is None:
                try:
                    review_task = ReviewTask.objects.filter(assistant_message_id=self.id).first()
                except Exception:
                    review_task = None
            else:
                review_task = review_task_by_assistant_message_id.get(self.id)
            if review_task and review_task.generation_status != ReviewTask.GENERATION_CANCELLED:
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
    GENERATION_QUEUED = 'queued'
    GENERATION_READING = 'reading'
    GENERATION_DRAFTING = 'drafting'
    GENERATION_REVIEW_READY = 'review_ready'
    GENERATION_FAILED = 'failed'
    GENERATION_CANCELLED = 'cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_session_id = models.CharField(max_length=36, db_index=True)
    assistant_message = models.OneToOneField(
        ChatMessages, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='review_task', db_column='assistant_message_id')
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    file_uuid = models.CharField(max_length=36, db_index=True)
    requester = models.CharField(max_length=255)
    prompt = models.TextField()
    route = models.CharField(max_length=32, default='review')
    org_id = models.BigIntegerField(null=True, blank=True)
    message_id = models.CharField(max_length=4, null=True, blank=True)
    allowed_block_ids = models.JSONField(default=list)
    allowed_text_targets = models.JSONField(default=list)
    scope_summary = models.TextField(default='')
    scope_snapshot_id = models.CharField(max_length=36, null=True, blank=True)
    scope_document_incarnation = models.CharField(max_length=36, null=True, blank=True)
    scope_sdoc_version = models.BigIntegerField(null=True, blank=True)
    generation_status = models.CharField(max_length=32, default=GENERATION_QUEUED, db_index=True)
    generation_revision = models.IntegerField(default=0)
    generation_attempt_id = models.UUIDField(null=True, blank=True, db_index=True)
    generation_deadline_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=64, null=True, blank=True)
    total_chunks = models.IntegerField(default=0)
    completed_chunks = models.IntegerField(default=0)
    total_review_blocks = models.IntegerField(default=0)
    completed_review_blocks = models.IntegerField(default=0)
    generation_truncated = models.BooleanField(default=False)
    generation_stop_reason = models.CharField(max_length=64, null=True, blank=True)
    generation_finished_at = models.DateTimeField(null=True, blank=True)
    base_sdoc_version = models.BigIntegerField(null=True, blank=True)
    current_changeset_revision = models.ForeignKey(
        'ReviewChangeSetRevision', null=True, blank=True, on_delete=models.RESTRICT,
        related_name='+', db_column='current_changeset_revision_id')
    current_card_revision = models.ForeignKey(
        'ReviewCardRevision', null=True, blank=True, on_delete=models.RESTRICT,
        related_name='+', db_column='current_card_revision_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_review_task'

    def to_dict(self):
        return {
            'id': str(self.id),
            'task_id': str(self.id),
            'chat_session_id': self.chat_session_id,
            'assistant_message_id': self.assistant_message_id,
            'assistant_content': self.assistant_message.content if self.assistant_message_id else None,
            'generation_status': self.generation_status,
            'generation_attempt_id': str(self.generation_attempt_id) if self.generation_attempt_id else None,
            'error_code': self.error_code,
            'total_chunks': self.total_chunks,
            'completed_chunks': self.completed_chunks,
            'total_review_blocks': self.total_review_blocks,
            'completed_review_blocks': self.completed_review_blocks,
            'generation_truncated': self.generation_truncated,
            'generation_stop_reason': self.generation_stop_reason,
            'generation_finished_at': self.generation_finished_at,
            'route': self.route,
            'prompt': self.prompt,
            'scope_summary': self.scope_summary,
            'base_sdoc_version': self.base_sdoc_version,
            'current_changeset_revision_id': self.current_changeset_revision_id,
            'current_card_revision_id': self.current_card_revision_id,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }


class ReviewChangeSetRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review_task = models.ForeignKey(
        ReviewTask, on_delete=models.RESTRICT, related_name='changeset_revisions',
        db_column='review_task_id')
    changeset_revision = models.IntegerField()
    snapshot_id = models.CharField(max_length=36)
    file_uuid = models.CharField(max_length=36, db_index=True)
    document_incarnation = models.CharField(max_length=36)
    exact_sdoc_version = models.BigIntegerField()
    projection_version = models.CharField(max_length=64, default='sdoc-agent-context/v1')
    scope_summary = models.TextField()
    revision_brief = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_review_changeset_revision'
        unique_together = (('review_task', 'changeset_revision'),)

    def to_dict(self):
        return {
            'id': str(self.id),
            'changeset_revision_id': str(self.id),
            'review_task_id': self.review_task_id,
            'changeset_revision': self.changeset_revision,
            'snapshot_id': self.snapshot_id,
            'file_uuid': self.file_uuid,
            'document_incarnation': self.document_incarnation,
            'exact_sdoc_version': self.exact_sdoc_version,
            'projection_version': self.projection_version,
            'scope_summary': self.scope_summary,
            'revision_brief': self.revision_brief,
        }


class ReviewGenerationChunk(models.Model):
    """Durable receipt for one progressive generation chunk."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review_task = models.ForeignKey(
        ReviewTask, on_delete=models.RESTRICT, related_name='generation_chunks',
        db_column='review_task_id')
    generation_attempt_id = models.UUIDField()
    chunk_index = models.IntegerField()
    block_count = models.IntegerField(default=0)
    created_item_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_review_generation_chunk'
        unique_together = (('review_task', 'generation_attempt_id', 'chunk_index'),)


class ReviewChangeItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    changeset_revision = models.ForeignKey(
        ReviewChangeSetRevision, on_delete=models.RESTRICT, related_name='items',
        db_column='changeset_revision_id')
    logical_item_id = models.UUIDField(null=True, blank=True, db_index=True)
    target_key = models.CharField(max_length=160, null=True, blank=True, db_index=True)
    kind = models.CharField(max_length=64)
    target = models.JSONField(default=dict)
    precondition = models.JSONField(default=dict)
    # Immutable display data; it is intentionally excluded from the strict
    # SDoc apply target/precondition contract.
    preview = models.JSONField(default=dict)
    after_text = models.TextField(default='')
    after_type = models.CharField(max_length=64, null=True, blank=True)
    rationale = models.TextField()
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_review_change_item'
        unique_together = (('changeset_revision', 'item_id'), ('changeset_revision', 'target_key'))
        ordering = ('sort_order',)

    def to_dict(self):
        return {
            'id': str(self.id),
            'item_id': str(self.item_id),
            'changeset_revision_id': self.changeset_revision_id,
            'logical_item_id': str(self.logical_item_id) if self.logical_item_id else None,
            'target_key': self.target_key,
            'kind': self.kind,
            'target': self.target,
            'precondition': self.precondition,
            'preview': self.preview,
            'after_text': self.after_text,
            'after_type': self.after_type,
            'rationale': self.rationale,
            'sort_order': self.sort_order,
        }


class ReviewCardRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review_task = models.ForeignKey(
        ReviewTask, on_delete=models.RESTRICT, related_name='card_revisions',
        db_column='review_task_id')
    changeset_revision = models.ForeignKey(
        ReviewChangeSetRevision, on_delete=models.RESTRICT, related_name='card_revisions',
        db_column='changeset_revision_id')
    card_revision = models.IntegerField()
    supersedes_decision = models.ForeignKey(
        'ReviewDecision', null=True, blank=True, on_delete=models.RESTRICT,
        related_name='+', db_column='supersedes_decision_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_review_card_revision'
        unique_together = (('review_task', 'card_revision'),)


class ReviewCardRevisionItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    card_revision_item_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    card_revision = models.ForeignKey(
        ReviewCardRevision, on_delete=models.RESTRICT, related_name='membership_items',
        db_column='card_revision_id')
    change_item = models.ForeignKey(
        ReviewChangeItem, on_delete=models.RESTRICT, related_name='card_memberships',
        db_column='change_item_id')
    reviewable = models.BooleanField(default=True)
    conflicted = models.BooleanField(default=False)
    selectable = models.BooleanField(default=True)
    conflict_summary = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_review_card_revision_item'
        unique_together = (('card_revision', 'change_item'),)

    def to_dict(self):
        return {
            'card_revision_item_id': str(self.card_revision_item_id),
            'change_item_id': str(self.change_item.item_id),
            'reviewable': self.reviewable,
            'conflicted': self.conflicted,
            'selectable': self.selectable,
            'conflict_summary': self.conflict_summary,
        }


class ReviewDecision(models.Model):
    KIND_APPROVED = 'approved'
    KIND_REJECTED = 'rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review_decision_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    card_revision = models.ForeignKey(
        ReviewCardRevision, on_delete=models.RESTRICT, related_name='decisions',
        db_column='card_revision_id')
    decision_kind = models.CharField(max_length=16)
    selection_digest = models.CharField(max_length=64)
    operator = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_review_decision'

    def to_dict(self):
        return {
            'review_decision_id': str(self.review_decision_id),
            'decision_kind': self.decision_kind,
            'selection_digest': self.selection_digest,
            'operator': self.operator,
            'created_at': self.created_at,
        }


class ReviewDecisionSelection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision = models.ForeignKey(
        ReviewDecision, on_delete=models.RESTRICT, related_name='selections',
        db_column='decision_id')
    card_revision_item = models.ForeignKey(
        ReviewCardRevisionItem, on_delete=models.RESTRICT, related_name='decision_selections',
        db_column='card_revision_item_id')

    class Meta:
        db_table = 'ai_review_decision_selection'
        # A card item represents one user-decidable suggestion.  It must not
        # be claimed by both an approve and a reject decision (or by two
        # concurrent approve requests).
        unique_together = (('decision', 'card_revision_item'), ('card_revision_item',))


class ApplyAttempt(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PREFLIGHT_CONFLICTED = 'preflight_conflicted'
    STATUS_COMMITTING = 'committing'
    STATUS_APPLIED = 'applied'
    STATUS_OUTCOME_UNKNOWN = 'outcome_unknown'
    STATUS_FAILED_PRECOMMIT = 'failed_precommit'

    PERSISTENCE_NOT_REQUESTED = 'not_requested'
    PERSISTENCE_PERSISTED = 'persisted'
    PERSISTENCE_SAVE_PENDING = 'save_pending'
    PERSISTENCE_FILE_UNAVAILABLE = 'file_unavailable'

    VERIFICATION_UNVERIFIED = 'unverified'
    VERIFICATION_CONFIRMED_APPLIED = 'confirmed_applied'
    VERIFICATION_CONFIRMED_NOT_APPLIED = 'confirmed_not_applied'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    apply_attempt_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    review_decision = models.OneToOneField(
        ReviewDecision, on_delete=models.RESTRICT, related_name='apply_attempt',
        db_column='review_decision_id')
    status = models.CharField(max_length=32, default=STATUS_PENDING, db_index=True)
    persistence_status = models.CharField(max_length=32, default=PERSISTENCE_NOT_REQUESTED)
    verification_status = models.CharField(max_length=32, default=VERIFICATION_UNVERIFIED)
    approved_by = models.CharField(max_length=255)
    selection_digest = models.CharField(max_length=64)
    apply_payload_digest = models.CharField(max_length=64)
    card_revision_number = models.IntegerField()
    changeset_revision_number = models.IntegerField()
    snapshot_id = models.CharField(max_length=36)
    document_incarnation = models.CharField(max_length=36)
    applied_sdoc_version = models.BigIntegerField(null=True, blank=True)
    operation_log_correlation_id = models.CharField(max_length=36, null=True, blank=True)
    result_query_deadline_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_review_apply_attempt'

    def to_dict(self):
        return {
            'apply_attempt_id': str(self.apply_attempt_id),
            'review_decision_id': self.review_decision_id,
            'status': self.status,
            'persistence_status': self.persistence_status,
            'verification_status': self.verification_status,
            'approved_by': self.approved_by,
            'applied_sdoc_version': self.applied_sdoc_version,
            'error_code': self.error_code,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
