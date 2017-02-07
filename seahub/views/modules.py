# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.base.models import UserEnabledModule, GroupEnabledModule

MOD_PERSONAL_WIKI = 'personal wiki'
MOD_GROUP_WIKI = 'group wiki'

class BadModNameError(Exception):
    pass

def get_available_mods_by_user(username):
    """Returns a list of available modules for user.
    """
    mods_available = [MOD_PERSONAL_WIKI, ]
    return mods_available

def get_enabled_mods_by_user(username):
    """Returns a list of enabled modules for user.
    """
    mod_enabled = []

    personal_wiki_enabled = UserEnabledModule.objects.filter(
        username=username, module_name=MOD_PERSONAL_WIKI).exists()

    if personal_wiki_enabled:
        mod_enabled.append(MOD_PERSONAL_WIKI)

    return mod_enabled

def enable_mod_for_user(username, mod_name):
    if mod_name != MOD_PERSONAL_WIKI:
        raise BadModNameError
    return UserEnabledModule(username=username, module_name=mod_name).save()

def disable_mod_for_user(username, mod_name):
    if mod_name != MOD_PERSONAL_WIKI:
        raise BadModNameError
    UserEnabledModule.objects.filter(username=username,
                                     module_name=mod_name).delete()


def get_available_mods_by_group(group_id):
    """Returns a list of available modules for group.
    """
    mods_available = [MOD_GROUP_WIKI, ]
    return mods_available

def get_enabled_mods_by_group(group_id):
    """Returns a list of enabled modules for group.
    """
    mod_enabled = []

    group_wiki_enabled = GroupEnabledModule.objects.filter(
        group_id=group_id, module_name=MOD_GROUP_WIKI).exists()

    if group_wiki_enabled:
        mod_enabled.append(MOD_GROUP_WIKI)
    return mod_enabled

def is_wiki_mod_enabled_for_group(group_id):
    group_wiki_enabled = GroupEnabledModule.objects.filter(
        group_id=group_id, module_name=MOD_GROUP_WIKI).exists()
    if group_wiki_enabled:
        return True
    else:
        return False

def enable_mod_for_group(group_id, mod_name):
    if mod_name != MOD_GROUP_WIKI:
        raise BadModNameError
    return GroupEnabledModule(group_id=group_id, module_name=mod_name).save()

def disable_mod_for_group(group_id, mod_name):
    if mod_name != MOD_GROUP_WIKI:
        raise BadModNameError
    GroupEnabledModule.objects.filter(group_id=group_id,
                                     module_name=mod_name).delete()

def get_wiki_enabled_group_list(in_group_ids=None):
    """Return all groups that enable wiki module by default.
    If ``in_group_ids`` is provided, return groups within that collection.

    Arguments:
    - `in_group_ids`: A list contains group ids.
    """
    qs = GroupEnabledModule.objects.all()
    if in_group_ids is not None:
        qs = qs.filter(group_id__in=in_group_ids)
    return qs
