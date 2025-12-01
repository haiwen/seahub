#!/bin/bash

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_seafile_data_dir=${TOPDIR}/seafile-data
default_conf_dir=${TOPDIR}/conf
seaf_gc=${INSTALLPATH}/seafile/bin/seafserv-gc
seaf_gc_opts=""
pro_pylibs_dir=${INSTALLPATH}/pro/python

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}
export SEAFILE_CENTRAL_CONF_DIR=${default_conf_dir}

script_name=$0
function usage () {
    echo "usage : "
    if [[ $IS_PRO_VERSION = "true" ]]; then
        echo "$(basename ${script_name}) [--dry-run | -D] [--rm-deleted | -r] [--rm-fs | -R] [repo-id1] [repo-id2]"
    else
        echo "$(basename ${script_name}) [--dry-run | -D] [--rm-deleted | -r] [repo-id1] [repo-id2]"
    fi 
    echo ""
}

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
            echo "Or if you installed it in a non-standard PATH, set the PYTHON enviroment variable to it"
            echo
            exit 1
        fi
    fi
}

function set_env_config () {
    if [ -z "${JWT_PRIVATE_KEY}" ]; then
        if [ ! -e "${SEAFILE_CENTRAL_CONF_DIR}/.env" ]; then
            echo "Error: .env file not found."
            echo "Please follow the upgrade manual to set the .env file."
            echo ""
            exit -1;
        fi

        # load the .env file
        set -a
        source "${SEAFILE_CENTRAL_CONF_DIR}/.env"
        set +a

        if [ -z "${JWT_PRIVATE_KEY}" ]; then
            echo "Error: JWT_PRIVATE_KEY not found in .env file."
            echo "Please follow the upgrade manual to set the .env file."
            echo ""
            exit -1;
        fi
        export JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY}
        export SEAFILE_MYSQL_DB_CCNET_DB_NAME=${SEAFILE_MYSQL_DB_CCNET_DB_NAME:-ccnet_db}
        export SEAFILE_MYSQL_DB_SEAFILE_DB_NAME=${SEAFILE_MYSQL_DB_SEAFILE_DB_NAME:-seafile_db}
        export SEAFILE_MYSQL_DB_SEAHUB_DB_NAME=${SEAFILE_MYSQL_DB_SEAHUB_DB_NAME:-seahub_db}
        export SEAFILE_SERVER_PROTOCOL=${SEAFILE_SERVER_PROTOCOL}
        export SEAFILE_SERVER_HOSTNAME=${SEAFILE_SERVER_HOSTNAME}
        export SITE_ROOT=${SITE_ROOT:-/}
    fi
}

function validate_seafile_data_dir () {
    if [[ ! -d ${default_seafile_data_dir} ]]; then
        echo "Error: there is no seafile server data directory."
        echo "Have you run setup-seafile.sh before this?"
        echo ""
        exit 1;
    fi
}

function check_component_running() {
    name=$1
    cmd=$2
    if pid=$(pgrep -f "$cmd" 2>/dev/null); then
        echo "[$name] is running, pid $pid. You can stop it by: "
        echo
        echo "        kill $pid"
        echo
        echo "Stop it and try again."
        echo
        exit
    fi
}

function validate_already_running () {
    if pid=$(pgrep -f "seafile-monitor.sh" 2>/dev/null); then
        echo "seafile server is still running, stop it by \"seafile.sh stop\""
        echo
        exit 1;
    fi

    check_component_running "seaf-server" "seaf-server"
    check_component_running "fileserver" "fileserver"
    check_component_running "seafdav" "wsgidav.server.server_cli"
}

function run_seaf_gc () {

    validate_seafile_data_dir;
    set_env_config;

    echo "Starting seafserv-gc, please wait ..."

    LD_LIBRARY_PATH=$SEAFILE_LD_LIBRARY_PATH ${seaf_gc} \
        -d "${default_seafile_data_dir}" \
        -F "${default_conf_dir}" \
        ${seaf_gc_opts}

    echo "seafserv-gc run done"
    echo
}

check_python_executable;

if [ $# -gt 0 ];
then
    for param in $@;
    do
        if [ ${param} = "-h" -o ${param} = "--help" ];
        then
            usage;
            exit 1;
        fi
    done
fi

seaf_gc_opts=$@
run_seaf_gc;

echo "Done."
