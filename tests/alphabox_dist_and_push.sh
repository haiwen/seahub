#!/bin/bash
: ${PYTHON=python3}

set -e
if [[ ${TRAVIS} != "" ]]; then
    set -x
fi

set -x
SEAHUB_TESTSDIR=$(python -c "import os; print(os.path.dirname(os.path.realpath('$0')))")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

export PYTHONPATH="/usr/local/lib/python3/site-packages:/usr/local/lib/python3/dist-packages:/usr/lib/python3/site-packages:/usr/lib/python3/dist-packages:${SEAHUB_SRCDIR}/thirdpart:${PYTHONPATH}"
cd "$SEAHUB_SRCDIR"
set +x

function commit_dist_files() {
    echo 'commit seahub'

    git config --global user.email "github_actions@seafile.com"
    git config --global user.name "GitHub Actions CI"

    git checkout -b alphabox-9.0-dist

    git add -u . && git add -A media/assets && git add -A static/scripts && git add -A frontend && git add -A locale
    git commit -m "[dist][CI SKIP] GitHub Actions CI build: #$GITHUB_BUILD_NUMBER, based on commit $GITHUB_SHA." -m "$GITHUB_COMMIT_MESSAGE"
}

function upload_files() {
    echo 'push dist to seahub-priv'

    # for seahub-priv
    echo 'push to seahub priv'
    git remote add seahub-priv https://imwhatiam:${TOKEN_FOR_PUSH_TO_SEAHUB_PRIV}@github.com/seafileltd/seahub-priv.git
    git push -f seahub-priv alphabox-9.0-dist
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
