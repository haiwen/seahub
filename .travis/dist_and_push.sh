#!/bin/bash
: ${PYTHON=python}

set -e
if [[ ${TRAVIS} != "" ]]; then
    set -x
fi

set -x
SEAHUB_TESTSDIR=$(python -c "import os; print os.path.dirname(os.path.realpath('$0'))")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

export PYTHONPATH="/usr/local/lib/python2.7/site-packages:/usr/lib/python2.7/site-packages:${SEAHUB_SRCDIR}/thirdpart:${PYTHONPATH}"
cd "$SEAHUB_SRCDIR"
set +x

function commit_dist_files() {
  git checkout -b dist-$TRAVIS_BRANCH
  git add -u . && git add -A media/assets && git add -A static/scripts && git add -A frontend && git add -A locale
  git commit -m "[dist] Travis build: #$TRAVIS_BUILD_NUMBER, based on commit $TRAVIS_COMMIT." -m "https://travis-ci.org/haiwen/seahub/builds/$TRAVIS_BUILD_ID" -m "$TRAVIS_COMMIT_MESSAGE"
}

function upload_files() {
    git push git@github.com:haiwen/seahub.git dist-$TRAVIS_BRANCH -f
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
