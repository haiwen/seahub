#!/bin/bash

set -e
set -x

SCRIPT=$(readlink -f "$0")
SEAHUB_TESTSDIR=$(dirname "${SCRIPT}")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

cd "$SEAHUB_SRCDIR"

# install phantomjs
curl -L -o /tmp/phantomjs.tar.bz2 https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.7-linux-x86_64.tar.bz2
tar -C /tmp -xf /tmp/phantomjs.tar.bz2
sudo install -m 755 /tmp/phantomjs-1.9.7-linux-x86_64/bin/phantomjs /usr/bin/phantomjs

# install casperjs
curl -L -o /tmp/casperjs.tar.gz https://github.com/n1k0/casperjs/archive/1.1-beta3.tar.gz
tar -C /tmp -xzf /tmp/casperjs.tar.gz
mkdir -p deps
mv /tmp/casperjs-1.1-beta3 deps/casperjs
sudo ln -s `readlink -f deps/casperjs/bin/casperjs` /usr/bin
