#!/bin/sh

commit_media_files() {
  git checkout -b dist-$TRAVIS_BRANCH
  git add -u . && git add -A media/assets && git add -A static/scripts
  git commit -m "[dist] Travis build: #$TRAVIS_BUILD_NUMBER, based on commit $TRAVIS_COMMIT." -m "https://travis-ci.org/haiwen/seahub/builds/$TRAVIS_BUILD_ID" -m "$TRAVIS_COMMIT_MESSAGE"
}

upload_files() {
    git push git@github.com:haiwen/seahub.git dist-$TRAVIS_BRANCH -f
}

make_dist() {
    make dist
}


# make_dist
commit_media_files
upload_files
