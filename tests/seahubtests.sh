#!/bin/bash
: ${PYTHON=python}

: ${SEAHUB_TEST_USERNAME="test@seafiletest.com"}
: ${SEAHUB_TEST_PASSWORD="testtest"}
: ${SEAHUB_TEST_ADMIN_USERNAME="admin@seafiletest.com"}
: ${SEAHUB_TEST_ADMIN_PASSWORD="adminadmin"}

export SEAHUB_TEST_USERNAME
export SEAHUB_TEST_PASSWORD
export SEAHUB_TEST_ADMIN_USERNAME
export SEAHUB_TEST_ADMIN_PASSWORD

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
local_settings_py=${SEAHUB_SRCDIR}/seahub/local_settings.py

export PYTHONPATH="/usr/local/lib/python2.7/site-packages:/usr/lib/python2.7/site-packages:${SEAHUB_SRCDIR}/thirdpart:${PYTHONPATH}"
cd "$SEAHUB_SRCDIR"

function init() {
    ###############################
    # create database and two new users: an admin, and a normal user
    ###############################
    $PYTHON ./manage.py syncdb

    # create normal user
    $PYTHON -c "import ccnet; pool = ccnet.ClientPool('${CCNET_CONF_DIR}'); ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True); ccnet_threaded_rpc.add_emailuser('${SEAHUB_TEST_USERNAME}', '${SEAHUB_TEST_PASSWORD}', 0, 1);"
    # create admin
    $PYTHON -c "import ccnet; pool = ccnet.ClientPool('${CCNET_CONF_DIR}'); ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True); ccnet_threaded_rpc.add_emailuser('${SEAHUB_TEST_ADMIN_USERNAME}', '${SEAHUB_TEST_ADMIN_PASSWORD}', 1, 1);"

    # overwrite api throttling settings in settings.py
    echo "REST_FRAMEWORK = {}" >> "${local_settings_py}"
}

function start_seahub() {
    # $PYTHON ./manage.py runserver 1>/dev/null 2>&1 &
    $PYTHON ./manage.py runserver 2>&1 &
    sleep 5
}

function run_tests() {
    pushd tests
    nosetests "$nose_opts"
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
        shift
        nose_opts=$@
        run_tests
        ;;
    *)
        echo "unknow command \"$1\""
        ;;
esac
