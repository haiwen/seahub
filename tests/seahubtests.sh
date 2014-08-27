#!/bin/bash
: ${PYTHON=python}
# Change these if you run on local machine
export CI_USERNAME="test@test.com"
export CI_PASSWORD="testtest"

# If you run this script on your local machine, you must set CCNET_CONF_DIR
# and SEAFILE_CONF_DIR like this:
#
#       export CCNET_CONF_DIR=/your/path/to/ccnet
#       export SEAFILE_CONF_DIR=/your/path/to/seafile-data
#

set -e
if [[ ${TRAVIS} != "" ]]; then
    set -x
fi

SCRIPT=$(readlink -f "$0")
SEAHUB_TESTSDIR=$(dirname "${SCRIPT}")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

export PYTHONPATH="/usr/local/lib/python2.7/site-packages:/usr/lib/python2.7/site-packages:${SEAHUB_SRCDIR}/thirdpart:${PYTHONPATH}"
cd "$SEAHUB_SRCDIR"

function init() {
    ###############################
    # create database and a new user
    ###############################
    $PYTHON ./manage.py syncdb
    $PYTHON -c "import ccnet; pool = ccnet.ClientPool('${CCNET_CONF_DIR}'); ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True); ccnet_threaded_rpc.add_emailuser('${CI_USERNAME}', '${CI_PASSWORD}', 1, 1);"
}

function start_seahub() {
    $PYTHON ./manage.py runserver 1>/dev/null &
    sleep 5
}

function run_tests() {
    pushd tests
    $PYTHON integration_suite.py
    popd
}

case $1 in
    "init")
        init
        ;;
    "runserver")
        start_seahub
        ;;
    "test")
        run_tests
        ;;
    *)
        echo "unknow command \"$1\""
        ;;
esac
