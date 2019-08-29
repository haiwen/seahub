#!/bin/bash

set -e
set -x

SCRIPT=$(readlink -f "$0")
SEAHUB_TESTSDIR=$(dirname "${SCRIPT}")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

cd "$SEAHUB_SRCDIR"

sudo mv /etc/nginx/sites-enabled/default /etc/nginx/default.backup
cat <<'EOF' >/tmp/seafile.conf
server {
    listen 80;
    server_name _ default_server;
    location /seafhttp {
        rewrite ^/fileserver(.*)$ $1 break;
        proxy_pass http://127.0.0.1:8082;
        client_max_body_size 0;
        proxy_connect_timeout  36000s;
        proxy_read_timeout  36000s;
    }

}
EOF

sudo mv /tmp/seafile.conf /etc/nginx/sites-enabled/default
sudo service nginx restart
