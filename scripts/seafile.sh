#!/bin/bash

### BEGIN INIT INFO
# Provides:          seafile
# Required-Start:    $local_fs $remote_fs $network
# Required-Stop:     $local_fs
# Default-Start:     1 2 3 4 5
# Default-Stop:
# Short-Description: Starts Seafile Server
# Description:       starts Seafile Server
### END INIT INFO

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_seafile_data_dir=${TOPDIR}/seafile-data
central_config_dir=${TOPDIR}/conf
pro_pylibs_dir=${INSTALLPATH}/pro/python
seafesdir=$pro_pylibs_dir/seafes
seahubdir=${INSTALLPATH}/seahub
seafile_rpc_pipe_path=${INSTALLPATH}/runtime

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export ORIG_LD_LIBRARY_PATH=${LD_LIBRARY_PATH}
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}
export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
export SEAFILE_CONF_DIR=${default_seafile_data_dir}
export SEAFILE_RPC_PIPE_PATH=${seafile_rpc_pipe_path}
export SEAHUB_DIR=$seahubdir
export SEAFDAV_CONF=${central_config_dir}/seafdav.conf
export MARIADB_PLUGIN_DIR=${INSTALLPATH}/seafile/lib/plugin

script_name=$0
function usage () {
    echo "usage : "
    echo "$(basename ${script_name}) { start | stop | restart } "
    echo ""
}

# check args
if [[ $# != 1 || ( "$1" != "start" && "$1" != "stop" && "$1" != "restart" ) ]]; then
    usage;
    exit 1;
fi

function validate_running_user () {
    real_data_dir=`readlink -f ${default_seafile_data_dir}`
    running_user=`id -un`
    data_dir_owner=`stat -c %U ${real_data_dir}`

    if [[ "${running_user}" != "${data_dir_owner}" ]]; then
        echo "Error: the user running the script (\"${running_user}\") is not the owner of \"${real_data_dir}\" folder, you should use the user \"${data_dir_owner}\" to run the script."
        exit -1;
    fi
}

export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub/thirdpart:${central_config_dir}:$PYTHONPATH
if [[ -d ${INSTALLPATH}/pro ]]; then
    export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
    export SEAFES_DIR=$seafesdir
fi

function set_env_config () {
    if [ -z "${JWT_PRIVATE_KEY}" ]; then
        echo "Cannot find JWT_PRIVATE_KEY value from environment, try to read .env file."
        if [ ! -e "${central_config_dir}/.env" ]; then
            echo "Error: .env file not found."
            echo "Please follow the upgrade manual to set the .env file."
            echo ""
            exit -1;
        fi

        # load the .env file
        set -a
        source "${central_config_dir}/.env"
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
        export ENABLE_FILESERVER=${ENABLE_FILESERVER}
        export ENABLE_SEAFDAV=${ENABLE_SEAFDAV}
    fi
}

function validate_central_conf_dir () {
    if [[ ! -d ${central_config_dir} ]]; then
        echo "Error: there is no conf/ directory."
        echo "Have you run setup-seafile.sh before this?"
        echo ""
        exit -1;
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
        echo "Seafile monitor is already running, pid $pid"
        echo
        exit 1;
    fi

    check_component_running "seaf-server" "seaf-server"
    check_component_running "fileserver" "fileserver"
    check_component_running "seafdav" "wsgidav.server.server_cli"
    check_component_running "seafevents" "seafevents.main --config-file ${central_config_dir}"
}

function start_seafile_server () {
    set_env_config;
    validate_already_running;
    validate_central_conf_dir;
    validate_seafile_data_dir;
    validate_running_user;

    echo "Starting seafile server, please wait ..."

    mkdir -p $TOPDIR/logs
    mkdir -p $TOPDIR/pids

    # seaf-server
    if [[ $IS_PRO_VERSION = "true" ]]; then
        LD_LIBRARY_PATH=${SEAFILE_LD_LIBRARY_PATH} ${INSTALLPATH}/seafile/bin/seaf-server \
            -F ${SEAFILE_CENTRAL_CONF_DIR} \
            -d ${SEAFILE_CONF_DIR} \
            -l ${TOPDIR}/logs/seafile.log \
            -P ${TOPDIR}/pids/seaf-server.pid \
            -p ${SEAFILE_RPC_PIPE_PATH} \
            -f -L ${TOPDIR} &
    else
        LD_LIBRARY_PATH=${SEAFILE_LD_LIBRARY_PATH} ${INSTALLPATH}/seafile/bin/seaf-server \
            -F ${SEAFILE_CENTRAL_CONF_DIR} \
            -d ${SEAFILE_CONF_DIR} \
            -l ${TOPDIR}/logs/seafile.log \
            -P ${TOPDIR}/pids/seaf-server.pid \
            -p ${SEAFILE_RPC_PIPE_PATH} \
            -f &
    fi

    sleep 2

    # seafile-monitor
    if [[ $SEAFILE_LOG_TO_STDOUT = "true" ]]; then
        ${INSTALLPATH}/seafile-monitor.sh &
    else
        ${INSTALLPATH}/seafile-monitor.sh &>> ${TOPDIR}/logs/seafile-monitor.log &
    fi

    sleep 1

    # check if seafile server started successfully
    if ! pgrep -f "seaf-server" 2>/dev/null 1>&2; then
        echo "Failed to start seafile server"
        kill_all
        exit 1;
    fi

    echo "Seafile server started"
    echo
}

function kill_all () {
    pkill -f "seaf-server"
    pkill -f "fileserver"
    pkill -f "seafevents.main"
    pkill -f "wsgidav.server.server_cli"
    pkill -f "seafile-monitor.sh"
}

function stop_seafile_server () {
    if ! pgrep -f "seafile-monitor.sh" 2>/dev/null 1>&2; then
        echo "seafile server not running yet"
        kill_all
        return 1
    fi

    echo "Stopping seafile server ..."
    kill_all

    return 0
}

function restart_seafile_server () {
    stop_seafile_server;
    sleep 5
    start_seafile_server;
}

case $1 in
    "start" )
        start_seafile_server;
        ;;
    "stop" )
        stop_seafile_server;
        ;;
    "restart" )
        restart_seafile_server;
esac

echo "Done."
