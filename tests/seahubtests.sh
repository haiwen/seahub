#!/bin/bash
: ${PYTHON=python3}

: ${SEAHUB_TEST_USERNAME="test@example.com"}
: ${SEAHUB_TEST_PASSWORD="testtest"}
: ${SEAHUB_TEST_ADMIN_USERNAME="admin@example.com"}
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

set -x
SEAHUB_TESTSDIR=$(python -c "import os; print(os.path.dirname(os.path.realpath('$0')))")
SEAHUB_SRCDIR=$(dirname "${SEAHUB_TESTSDIR}")

export SEAHUB_LOG_DIR='/tmp/logs'
export PYTHONPATH="/usr/local/lib/python3.8/site-packages:/usr/local/lib/python3.8/dist-packages:/usr/lib/python3.8/site-packages:/usr/lib/python3.8/dist-packages:${SEAHUB_SRCDIR}/thirdpart:${PYTHONPATH}"
cd "$SEAHUB_SRCDIR"
set +x

function init() {
    ###############################
    # create database and two new users: an admin, and a normal user
    ###############################
    $PYTHON ./manage.py makemigrations
    $PYTHON ./manage.py migrate --noinput

    # create normal user
    $PYTHON -c "import os; from seaserv import ccnet_api; ccnet_api.add_emailuser('${SEAHUB_TEST_USERNAME}', '${SEAHUB_TEST_PASSWORD}', 0, 1);"
    # create admin
    $PYTHON -c "import os; from seaserv import ccnet_api; ccnet_api.add_emailuser('${SEAHUB_TEST_ADMIN_USERNAME}', '${SEAHUB_TEST_ADMIN_PASSWORD}', 1, 1);"

}

function start_seahub() {
    $PYTHON ./manage.py runserver 1>/tmp/logs/seahub.access.log 2>&1 &
    sleep 5
}

function make_dist() {
    echo "Making dist files ..."

    make dist
}

function run_tests() {
    set +e
    py.test $nose_opts tests
    rvalue=$?

    # ignore 120 exited code in python3.6
    if [[ $rvalue == 120 ]]; then
    	  rvalue=0
    fi

    # if [[ ${TRAVIS} != "" ]]; then
    #     # On travis-ci, dump seahub logs when test finished
    #     for logfile in /tmp/logs/*.log; do
    #         echo -e "\nLog file $logfile:\n"
    #         cat "${logfile}"
    #         echo
    #     done
    # fi
    exit $rvalue
}

case $1 in
    "init")
        init
        ;;
    "runserver")
        start_seahub
        ;;
    "dist")
        make_dist
        ;;
    "test")
        shift
        nose_opts=$*
        run_tests
        ;;
    *)
        echo "unknow command \"$1\""
        ;;
esac
