#!/bin/bash
: ${PYTHON=python3}

set -e
if [[ ${TRAVIS} != "" ]]; then
    set -x
fi

set -x
SEAHUB_TESTSDIR=$(python -c "import os; print(os.path.dirname(os.path.realpath('$0')))")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

export PYTHONPATH="${PYTHONPATH}:/opt/hostedtoolcache/Python/3.8.16/x64/lib/python3.8/site-packages/:/usr/local/lib/python3/site-packages:/usr/lib/python3/dist-packages:/usr/local/lib/python3/dist-packages:/usr/lib/python3/site-packages:${SEAHUB_SRCDIR}/thirdpart"
cd "$SEAHUB_SRCDIR"
set +x

function commit_dist_files() {
    echo 'commit seahub'
    git checkout -b dist-$GITHUB_BRANCH
    git add -u . && git add -A media/assets && git add -A static/scripts && git add -A frontend && git add -A locale
    git config --global user.email "github_actions@seafile.com"
    git config --global user.name "GitHub Actions CI"
    git commit -m "[dist][CI SKIP] GitHub Actions CI build: #$GITHUB_BUILD_NUMBER, based on commit $GITHUB_SHA." -m "$GITHUB_COMMIT_MESSAGE"
}

function upload_files() {
    echo 'push dist to seahub'
    git remote add token-origin https://x-access-token:$GITHUB_TOKEN@github.com/haiwen/seahub.git
    git push -f token-origin dist-$GITHUB_BRANCH
}

function make_dist() {
    echo "Making dist files ..."
    make dist
}

function build_frontend() {
    echo "Building frontend/src files ..."
    cd ./frontend && npm install && CI=false npm run build && cd ..

}

build_frontend
make_dist
commit_dist_files
upload_files
