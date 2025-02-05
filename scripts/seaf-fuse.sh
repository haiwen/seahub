#!/bin/bash

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
default_conf_dir=${TOPDIR}/conf
seaf_fuse=${INSTALLPATH}/seafile/bin/seaf-fuse

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}
export SEAFILE_CENTRAL_CONF_DIR=${default_conf_dir}

script_name=$0
function usage () {
    echo "usage : "
    echo "$(basename ${script_name}) { start <mount-point> | stop | restart <mount-point> } "
    echo ""
}

# check args
if [[ "$1" != "start" && "$1" != "stop" && "$1" != "restart" ]]; then
    usage;
    exit 1;
fi

if [[ ($1 == "start" || $1 == "restart" ) && $# -lt 2 ]]; then
    usage;
    exit 1
fi

if [[ $1 == "stop" && $# != 1 ]]; then
    usage;
    exit 1
fi

function set_env_config () {
    if [ -z "${JWT_PRIVATE_KEY}" ]; then
        echo "Cannot find JWT_PRIVATE_KEY value from environment, try to read .env file."
        if [ ! -e "${SEAFILE_CENTRAL_CONF_DIR}/.env" ]; then
            echo "Error: .env file not found."
            echo "Please follow the upgrade manual to set the .env file."
            echo ""
            exit -1;
        fi

        # load the .env file
        source "${SEAFILE_CENTRAL_CONF_DIR}/.env"

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

function validate_already_running () {
    if pid=$(pgrep -f "bin/seaf-fuse" 2>/dev/null); then
        echo "seaf-fuse is already running, pid $pid"
        echo
        exit 1;
    fi
}

function warning_if_seafile_not_running () {
    if ! pgrep -f "seafile-monitor.sh" 2>/dev/null 1>&2; then
        echo
        echo "Warning: seafile server not running. Have you run \"./seafile.sh start\" ?"
        echo
    fi
}

function start_seaf_fuse () {
    validate_already_running;
    warning_if_seafile_not_running;
    validate_seafile_data_dir;
    set_env_config;

    echo "Starting seaf-fuse, please wait ..."

    logfile=${TOPDIR}/logs/seaf-fuse.log

    LD_LIBRARY_PATH=$SEAFILE_LD_LIBRARY_PATH ${seaf_fuse} \
        -c "${default_ccnet_conf_dir}" \
        -d "${default_seafile_data_dir}" \
        -F "${default_conf_dir}" \
        -l "${logfile}" \
        "$@"

    sleep 2

    # check if seaf-fuse started successfully
    if ! pgrep -f "bin/seaf-fuse" 2>/dev/null 1>&2; then
        echo "Failed to start seaf-fuse"
        exit 1;
    fi

    echo "seaf-fuse started"
    echo
}

function stop_seaf_fuse() {
    if ! pgrep -f "bin/seaf-fuse" 2>/dev/null 1>&2; then
        echo "seaf-fuse not running yet"
        return 1;
    fi

    echo "Stopping seaf-fuse ..."
    pkill -SIGTERM -f "seaf-fuse"
    return 0
}

function restart_seaf_fuse () {
    stop_seaf_fuse
    sleep 2
    start_seaf_fuse $@
}

case $1 in
    "start" )
	shift
        start_seaf_fuse $@;
        ;;
    "stop" )
        stop_seaf_fuse;
        ;;
    "restart" )
	shift
        restart_seaf_fuse $@;
esac

echo "Done."
