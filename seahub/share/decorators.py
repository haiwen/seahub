# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import tempfile
import urllib2
from PIL import Image
from StringIO import StringIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from pdfrw import PdfReader, PdfWriter, PageMerge

from django.http import HttpResponse
from django.core.cache import cache
from django.conf import settings
from django.http import Http404
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _

from seaserv import seafile_api
from seahub.share.models import FileShare, UploadLinkShare
from seahub.utils import normalize_cache_key, is_pro_version, \
        get_file_type_and_ext, render_error, gen_file_get_url
from seahub.settings import ENABLE_SHARE_LINK_WATERMARK, WATERMARK_PATH
from seahub.thumbnail.utils import add_text_to_image
from seahub.base.templatetags.seahub_tags import email2nickname

logger = logging.getLogger(__name__)


def share_link_audit(func):
    def _decorated(request, token, *args, **kwargs):
        assert token is not None    # Checked by URLconf

        fileshare = FileShare.objects.get_valid_file_link_by_token(token) or \
                    FileShare.objects.get_valid_dir_link_by_token(token) or \
                    UploadLinkShare.objects.get_valid_upload_link_by_token(token)
        if fileshare is None:
            raise Http404

        if not is_pro_version() or not settings.ENABLE_SHARE_LINK_AUDIT:
            return func(request, fileshare, *args, **kwargs)

        # no audit for authenticated user, since we've already got email address
        if request.user.is_authenticated():
            return func(request, fileshare, *args, **kwargs)

        # anonymous user
        if request.session.get('anonymous_email') is not None:
            request.user.username = request.session.get('anonymous_email')
            return func(request, fileshare, *args, **kwargs)

        if request.method == 'GET':
            return render_to_response('share/share_link_audit.html', {
                'token': token,
            }, context_instance=RequestContext(request))
        elif request.method == 'POST':
            code = request.POST.get('code', '')
            email = request.POST.get('email', '')

            cache_key = normalize_cache_key(email, 'share_link_audit_')
            if code == cache.get(cache_key):
                # code is correct, add this email to session so that he will
                # not be asked again during this session, and clear this code.
                request.session['anonymous_email'] = email
                request.user.username = request.session.get('anonymous_email')
                cache.delete(cache_key)
                return func(request, fileshare, *args, **kwargs)
            else:
                return render_to_response('share/share_link_audit.html', {
                    'err_msg': 'Invalid token, please try again.',
                    'email': email,
                    'code': code,
                    'token': token,
                }, context_instance=RequestContext(request))
        else:
            assert False, 'TODO'

    return _decorated

def share_link_dl_watermark(func):
    def _decorated(request, fileshare, *args, **kwargs):
        if request.GET.get('dl', '') != '1':
            return func(request, fileshare, *args, **kwargs)
        if fileshare.get_permissions()['can_download'] is False:
            raise Http404
        path = fileshare.path.rstrip('/')  # Normalize file path
        filename = os.path.basename(path)
        filetype, fileext = get_file_type_and_ext(filename)
        if not ENABLE_SHARE_LINK_WATERMARK or filetype not in ['Image', 'PDF']:
            return func(request, fileshare, *args, **kwargs)

        watermark_parent_path = os.path.join(WATERMARK_PATH, filetype)
        if not os.path.exists(watermark_parent_path):
            os.makedirs(watermark_parent_path)

        shared_by = fileshare.username
        repo_id = fileshare.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            raise Http404
        obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not obj_id:
            return render_error(request, _(u'File does not exist'))

        watermark_source_path = os.path.join(watermark_parent_path, obj_id)

        access_token = seafile_api.get_fileserver_access_token(repo.id,
                obj_id, 'view', '', use_onetime=False)

        if filetype == 'Image':
            if os.path.exists(watermark_source_path):
                image = Image.open(watermark_source_path)
            else:
                image_content = urllib2.urlopen(gen_file_get_url(access_token, filename)).read()
                image = Image.open(StringIO(image_content))
                image = add_text_to_image(image, shared_by, email2nickname(shared_by))
                image.save(watermark_source_path, 'PNG')

            response = HttpResponse(content_type='image/png')
            response['Content-Disposition'] = 'attachment; filename=%s' % filename
            image.save(response, 'PNG')
            return response

        if filetype == 'PDF':
            if os.path.exists(watermark_source_path):
                pdfreader = PdfReader(watermark_source_path)
            else:
                pdf_content = urllib2.urlopen(gen_file_get_url(access_token, filename)).read()
                pdfreader = PdfReader(StringIO(pdf_content))
                if pdfreader.Encrypt:
                    logger.info("%s has been encrypted" % filename)
                else:
                    for page in pdfreader.pages:
                        info = PageMerge().add(page)
                        zero, zero, width, height = info.xobj_box
                        fd, temp_watermark = tempfile.mkstemp(suffix='PDF')
                        os.close(fd)
                        c = canvas.Canvas(temp_watermark, pagesize=letter)
                        c.setFillColorRGB(0, 1, 0)
                        c.setFontSize(20)
                        c.rotate(30)
                        c.drawString(width/2 - 200, height / 3, email2nickname(shared_by))
                        c.drawString(width/2 - 100, height / 3, shared_by)
                        c.save()
                        watermark = PageMerge().add(PdfReader(temp_watermark).pages[0])[0]

                        PageMerge(page).add(watermark, prepend=False).render()

                PdfWriter(watermark_source_path, trailer=pdfreader).write()
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename=%s' % filename
            PdfWriter(response, trailer=pdfreader).write()
            return response
    return _decorated
