#!/bin/bash
: ${PYTHON=python}
export TEST_USERNAME="test@seahubtest.com"
export TEST_PASSWORD="testtest"
export TEST_ADMIN_USERNAME="admin@seahubtest.com"
export TEST_ADMIN_PASSWORD="adminadmin"

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
    # create database and two new users: an admin, and a normal user
    ###############################
    $PYTHON ./manage.py syncdb

    # create normal user
    $PYTHON -c "import ccnet; pool = ccnet.ClientPool('${CCNET_CONF_DIR}'); ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True); ccnet_threaded_rpc.add_emailuser('${TEST_USERNAME}', '${TEST_PASSWORD}', 0, 1);"
    # create admin
    $PYTHON -c "import ccnet; pool = ccnet.ClientPool('${CCNET_CONF_DIR}'); ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True); ccnet_threaded_rpc.add_emailuser('${TEST_ADMIN_USERNAME}', '${TEST_ADMIN_PASSWORD}', 1, 1);"
}

function start_seahub() {
    $PYTHON ./manage.py runserver 1>/dev/null 2>&1 &
    sleep 5
}

function run_tests() {
    pushd tests
    nosetests
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
