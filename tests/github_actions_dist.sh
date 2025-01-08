#!/bin/bash

set -e
set -x

# get branch name
if test $GITHUB_EVENT_NAME = "pull_request"; then
    branch=$GITHUB_HEAD_REF
else
    branch=${GITHUB_REF##*/}
fi
export GITHUB_BRANCH=$branch
echo 'GITHUB_BRANCH'
echo $GITHUB_BRANCH

# clone dependent repositories
mkdir -p /tmp/repositories

git clone --depth=1 https://github.com/haiwen/seafile-server.git /tmp/repositories/seafile-server
git clone --depth=1 https://github.com/haiwen/ccnet-server.git /tmp/repositories/ccnet-server
git clone --depth=1 https://github.com/haiwen/libsearpc.git /tmp/repositories/libsearpc

# copy dependent files
mkdir /tmp/site-packages

cp -r /tmp/repositories/seafile-server/python/seafile /tmp/site-packages/seafile
cp -r /tmp/repositories/seafile-server/python/seaserv /tmp/site-packages/seaserv
cp -r /tmp/repositories/ccnet-server/python/ccnet /tmp/site-packages/ccnet
cp -r /tmp/repositories/libsearpc/pysearpc /tmp/site-packages/pysearpc

export PYTHONPATH="${PYTHONPATH}:/tmp/site-packages"
echo 'PYTHONPATH'
echo $PYTHONPATH

# write conf
mkdir /tmp/conf && cd /tmp/conf
cat >ccnet.conf <<EOF
[General]
SERVICE_URL = http://127.0.0.1:8000
[Database]
CREATE_TABLES=true
EOF

cat >seafile.conf <<EOF
[fileserver]
port=8082
[database]
create_tables=true
EOF

export CCNET_CONF_DIR=/tmp/conf SEAFILE_CONF_DIR=/tmp/conf

echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >~/.npmrc

# make dist
cd $GITHUB_WORKSPACE
pip install -r requirements.txt
tests/dist_and_push.sh
