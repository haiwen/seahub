#!/bin/bash

### BEGIN INIT INFO
# Provides:          seahub
# Required-Start:    $local_fs $remote_fs $network
# Required-Stop:     $local_fs
# Default-Start:     1 2 3 4 5
# Default-Stop:
# Short-Description: Starts Seahub
# Description:       starts Seahub
### END INIT INFO

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
central_config_dir=${TOPDIR}/conf
seafile_rpc_pipe_path=${INSTALLPATH}/runtime

manage_py=${INSTALLPATH}/seahub/manage.py
gunicorn_conf=${TOPDIR}/conf/gunicorn.conf.py
pidfile=${TOPDIR}/pids/seahub.pid
errorlog=${TOPDIR}/logs/gunicorn_error.log
accesslog=${TOPDIR}/logs/gunicorn_access.log
gunicorn_exe=${INSTALLPATH}/seahub/thirdpart/bin/gunicorn

pro_pylibs_dir=${INSTALLPATH}/pro/python


script_name=$0

function check_python_executable() {
    if [[ "$PYTHON" != "" && -x $PYTHON ]]; then
        return 0
    fi

    if which python3 2>/dev/null 1>&2; then
        PYTHON=python3
    elif !(python --version 2>&1 | grep "3\.[0-9]\.[0-9]") 2>/dev/null 1>&2; then
        echo
        echo "The current version of python is not 3.x.x, please use Python 3.x.x ."
        echo
        exit 1
    else
        PYTHON="python"$(python --version | cut -b 8-10)
        if !which $PYTHON 2>/dev/null 1>&2; then
            echo
            echo "Can't find a python executable of $PYTHON in PATH"
            echo "Install $PYTHON before continue."
            echo "Or if you installed it in a non-standard PATH, set the PYTHON enviroment varirable to it"
            echo
            exit 1
        fi
    fi
}

function validate_ccnet_conf_dir () {
    if [[ ! -d ${default_ccnet_conf_dir} ]]; then
        echo "Error: there is no ccnet config directory."
        echo "Have you run setup-seafile.sh before this?"
        echo ""
        exit -1;
    fi
}

function prepare_env() {
    check_python_executable;
    validate_ccnet_conf_dir;

    if [[ -z "$LANG" ]]; then
        echo "LANG is not set in ENV, set to en_US.UTF-8"
        export LANG='en_US.UTF-8'
    fi
    if [[ -z "$LC_ALL" ]]; then
        echo "LC_ALL is not set in ENV, set to en_US.UTF-8"
        export LC_ALL='en_US.UTF-8'
    fi

    export CCNET_CONF_DIR=${default_ccnet_conf_dir}
    export SEAFILE_CONF_DIR=${default_seafile_data_dir}
    export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
    export SEAFILE_RPC_PIPE_PATH=${seafile_rpc_pipe_path}
    export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3.6/site-packages:${INSTALLPATH}/seafile/lib64/python3.6/site-packages:${INSTALLPATH}/seahub:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH
}

function do_copy () {
    validate_ccnet_conf_dir;

    prepare_env;

    export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3.6/site-packages:${INSTALLPATH}/seafile/lib64/python3.6/site-packages:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH
    export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
    export PYTHONPATH=$PYTHONPATH:${INSTALLPATH}/seahub-extra/
    export PYTHONPATH=$PYTHONPATH:${INSTALLPATH}/seahub-extra/thirdparts
    export SEAFES_DIR=$pro_pylibs_dir/seafes
}

do_copy;
basepath=$(cd `dirname $0`; pwd);
if [ $# == 5 ]; then
    $PYTHON ${basepath}/copy_repos.py $*
else 
    $PYTHON ${basepath}/copy_users.py $*
fi

echo "Done.1"
