# Copyright (c) 2012-2016 Seafile Ltd.
import operator

from django.conf import settings
from django.db import models
from django.db.models import Q


class TrustedIPManager(models.Manager):

    def get_or_create(self, ip):
        try:
            ip_obj = super(TrustedIPManager, self).get(ip=ip)
            return ip_obj, False
        except self.model.DoesNotExist:
            ip_obj = self.model(ip=ip)
            ip_obj.save()
            return ip_obj, True

    def delete(self, ip):
        try:
            ip_obj = super(TrustedIPManager, self).get(ip=ip)
            ip_obj.delete()
            return True
        except self.model.DoesNotExist:
            return False

    def match_ip(self, ip):
        ip_list = ['*.*.*.*']
        ip_list.append(ip)
        for i in range(4):
            ip_list_tmp = ip.split('.')
            ip_list_tmp.remove(ip_list_tmp[i])
            ip_list_tmp.insert(i, '*')
            new_ip = '.'.join(ip_list_tmp)
            ip_list.append(new_ip)

        ip_list_tmp = ip.split('.')
        ip_list.append('*.*.'+ip_list_tmp[2]+'.'+ip_list_tmp[3])
        ip_list.append('*.'+ip_list_tmp[1]+'.*.'+ip_list_tmp[3])
        ip_list.append('*.'+ip_list_tmp[1]+'.'+ip_list_tmp[2]+'.*')
        ip_list.append(ip_list_tmp[0]+'.*.*.'+ip_list_tmp[3])
        ip_list.append(ip_list_tmp[0]+'.*.'+ip_list_tmp[2]+'.*')
        ip_list.append(ip_list_tmp[0]+'.'+ip_list_tmp[1]+'.*.*')

        ip_list.append('*.*.*.'+ip_list_tmp[3])
        ip_list.append('*.*.'+ip_list_tmp[2]+'.*')
        ip_list.append('*.'+ip_list_tmp[1]+'.*.*')
        ip_list.append(ip_list_tmp[0]+'.*.*.*')

        query_list = [Q(ip=ip) for ip in ip_list]
        ip_obj = super(TrustedIPManager, self).filter(reduce(operator.or_, query_list))
        if len(ip_obj) > 0:
            return True
        else:
            return False


class TrustedIP(models.Model):
    ip = models.CharField(max_length=15)
    objects = TrustedIPManager()

    def to_dict(self):
        return {
            'ip': self.ip
        }
