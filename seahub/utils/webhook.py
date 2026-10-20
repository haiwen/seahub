"""Validation for public webhook destinations."""

import ipaddress
import socket
from urllib.parse import urlsplit

import requests


def validate_webhook_url(url):
    # Keep URL validation in sync with seafevents.webhook.http. The delivery
    # worker also validates and pins DNS results; API validation alone is unsafe.
    if not isinstance(url, str) or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in url):
        raise ValueError('Invalid webhook URL.')
    try:
        if '\\' in url:
            raise ValueError()
        parts = urlsplit(url)
        if (parts.scheme not in ('http', 'https') or not parts.hostname or
                parts.username is not None or parts.password is not None or parts.fragment or
                parts.port == 0):
            raise ValueError()
        prepared = requests.Request('POST', url).prepare()
        parts = urlsplit(prepared.url)
        host = parts.hostname
        if '%' in host:
            raise ValueError()
        try:
            socket.inet_aton(host)
        except OSError:
            pass
        else:
            ipaddress.IPv4Address(host)
        port = parts.port if parts.port is not None else (443 if parts.scheme == 'https' else 80)
        if port == 0:
            raise ValueError()
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        if not addresses:
            raise ValueError()
        for family, _, _, _, address in addresses:
            ip = ipaddress.ip_address(address[0])
            if (family not in (socket.AF_INET, socket.AF_INET6) or
                    not ip.is_global or ip.is_multicast or ip.is_reserved or
                    ip.is_loopback or ip.is_link_local or ip.is_unspecified):
                raise ValueError()
            if isinstance(ip, ipaddress.IPv6Address):
                if (ip.is_site_local or ip.ipv4_mapped or ip.sixtofour or ip.teredo or
                        ip in ipaddress.ip_network('64:ff9b::/96') or
                        ip in ipaddress.ip_network('64:ff9b:1::/48')):
                    raise ValueError()
    except (ValueError, OSError, requests.RequestException) as e:
        raise ValueError('Webhook URL must resolve only to public IP addresses.') from e
