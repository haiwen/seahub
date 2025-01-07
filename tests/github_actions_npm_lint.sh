#!/bin/bash

set -e
set -x

if test $GITHUB_EVENT_NAME = "pull_request"; then
    branch=$GITHUB_HEAD_REF
else
    branch=${GITHUB_REF##*/}
fi

export GITHUB_BRANCH=$branch

export PYTHONPATH="${PYTHONPATH}:/tmp/site-packages"

echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >~/.npmrc

cd $GITHUB_WORKSPACE

cd ./frontend && npm install && npm run lint && npm run test
