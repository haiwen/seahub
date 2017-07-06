#!/bin/bash

set -e
set -x

SCRIPT=$(readlink -f "$0")
SEAHUB_TESTSDIR=$(dirname "${SCRIPT}")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

cd "$SEAHUB_SRCDIR"

# install phantomjs
# curl -L -o /tmp/phantomjs.tar.bz2 https://dl.bintray.com/seafile-org/generic/phantomjs/phantomjs-1.9.7-linux-x86_64.tar.bz2
# tar -C /tmp -xf /tmp/phantomjs.tar.bz2
# sudo install -m 755 /tmp/phantomjs-1.9.7-linux-x86_64/bin/phantomjs /usr/bin/phantomjs

sudo apt-get install -y phantomjs nginx
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

sudo mv /tmp/seafile.conf /etc/nginx/sites-enabled/
sudo service nginx restart
