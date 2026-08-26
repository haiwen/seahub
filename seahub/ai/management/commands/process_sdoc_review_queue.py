import logging
import time
import uuid

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone

from seahub.ai.models import ReviewTask, ensure_review_tables
from seahub.ai.review_views import run_generation, mark_generation_failed

logger = logging.getLogger(__name__)

GENERATION_TIMEOUT_SECONDS = 200
BATCH_SIZE = 5
POLL_INTERVAL_SECONDS = 2


class Command(BaseCommand):
    help = 'Process queued SDoc review generation tasks.'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help='Process one batch and exit.')

    def handle(self, *args, **options):
        ensure_review_tables()
        while True:
            processed = self.process_batch()
            if options['once']:
                break
            if not processed:
                time.sleep(POLL_INTERVAL_SECONDS)

    def process_batch(self):
        now = timezone.now()

        # Mark stale in-progress tasks as failed (lease expired).
        ReviewTask.objects.filter(
            generation_status__in=['reading', 'drafting'],
            generation_deadline_at__lt=now).update(
            generation_status=ReviewTask.GENERATION_FAILED,
            error_code='generation_timeout',
            updated_at=now)

        tasks = list(ReviewTask.objects.filter(
            generation_status=ReviewTask.GENERATION_QUEUED).order_by('created_at')[:BATCH_SIZE])
        for task in tasks:
            self.process_one(task)
        return bool(tasks)

    def process_one(self, task):
        attempt_id = uuid.uuid4()
        claimed = ReviewTask.objects.filter(
            id=task.id, generation_status=ReviewTask.GENERATION_QUEUED).update(
            generation_status=ReviewTask.GENERATION_READING,
            generation_attempt_id=attempt_id,
            generation_revision=F('generation_revision') + 1,
            generation_deadline_at=timezone.now() + timezone.timedelta(seconds=GENERATION_TIMEOUT_SECONDS),
            updated_at=timezone.now())
        if not claimed:
            return
        task.refresh_from_db()
        try:
            run_generation(task, task.chat_session_id, task.message_id)
            # persist_review sets the task to review_ready on success.
        except Exception as error:
            logger.exception('SDoc review generation failed for task %s', task.id)
            mark_generation_failed(task, attempt_id=attempt_id)
