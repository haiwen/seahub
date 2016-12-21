# Copyright (c) 2012-2016 Seafile Ltd.
from seaserv import seafile_api
from seahub.profile.models import Profile
from seahub.institutions.models import InstitutionQuota


def get_institution_space_usage(inst):
    # TODO: need to refactor
    usernames = [x.user for x in Profile.objects.filter(institution=inst.name)]
    total = 0
    for user in usernames:
        total += seafile_api.get_user_self_usage(user)
    return total

def get_institution_available_quota(inst):
    inst_quota = InstitutionQuota.objects.get_or_none(institution=inst)
    if inst_quota is None:
        return None

    usernames = [x.user for x in Profile.objects.filter(institution=inst.name)]
    allocated = 0
    for user in usernames:
        allocated += seafile_api.get_user_quota(user)

    return 0 if allocated >= inst_quota else inst_quota - allocated
