from django.http import HttpResponseRedirect, Http404

from seahub.settings import SITE_BASE_NAME, SITE_SUBDOMAIN

class SubdomainMiddleware(object):

    def process_request(self, request):
        if not request.user.is_authenticated():
            return None

        host = request.META.get('HTTP_HOST', '')
        http_or_https = request.is_secure() and 'https://' or 'http://'
        has_subdomain = True if host.replace(SITE_BASE_NAME, '', 1).find('.') >= 0 else False
        full_path = request.get_full_path()
        
        if request.user.org:
            # business account
            url_prefix = request.user.org.url_prefix
            if not has_subdomain:
                host = request.user.org.url_prefix + '.' + host
                return HttpResponseRedirect(http_or_https + host + full_path)
            elif host.split('.')[0] != url_prefix:
                host = url_prefix + '.' + '.'.join(host.split('.')[1:])
                return HttpResponseRedirect(http_or_https + host + full_path)
        else:
            # personal account
            if not has_subdomain:
                host = SITE_SUBDOMAIN + '.' + host
                return HttpResponseRedirect(http_or_https + host + full_path)
            elif host.split('.')[0] != SITE_SUBDOMAIN:
                host = SITE_SUBDOMAIN + '.' + '.'.join(host.split('.')[1:])
                return HttpResponseRedirect(http_or_https + host + full_path)
                    
        return None

    def process_response(self, request, response):
        return response
