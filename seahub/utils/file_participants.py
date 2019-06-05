from seahub.base.models import FileParticipant


def add_file_participant(repo_id, path, email):
    """ add file participant when a user upload or update a file
    """
    FileParticipant.objects.add_by_file_path_and_username(repo_id, path, email)


def list_file_participants_username(repo_id, path):
    """ return participants username list
    """
    username_list = []
    file_participant_queryset = FileParticipant.objects.get_by_file_path(repo_id, path)
    for participant in file_participant_queryset:
        username_list.append(participant.username)

    return username_list
