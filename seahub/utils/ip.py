# Copyright (c) 2012-2016 Seafile Ltd.
def get_remote_ip(request):
    x_forwarded_for = request.headers.get('x-forwarded-for')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', '-')
    return ip
