from .models import FileParticipant


def list_file_participants_username(repo_id, path):
    """ return participants username list
    """
    username_list = []
    file_participant_queryset = FileParticipant.objects.get_by_file_path(repo_id, path)
    for participant in file_participant_queryset:
        username_list.append(participant.username)

    return username_list
