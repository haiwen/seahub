import logging

from .models import FileParticipant
from seahub.tags.models import FileUUIDMap

logger = logging.getLogger(__name__)


def list_file_participants(repo_id, path):
    """ return participants username list
    """
    username_list = []
    try:
        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False)

        participant_queryset = FileParticipant.objects.get_participants(file_uuid)
        for participant in participant_queryset:
            username_list.append(participant.username)
    except Exception as e:
        logger.error(e)

    return username_list
