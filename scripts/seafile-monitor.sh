#!/bin/bash

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
central_config_dir=${TOPDIR}/conf
pro_pylibs_dir=${INSTALLPATH}/pro/python
seafesdir=$pro_pylibs_dir/seafes
seahubdir=${INSTALLPATH}/seahub
seafile_rpc_pipe_path=${INSTALLPATH}/runtime
IS_PRO_SEAFEVENTS=`awk '/is_pro/{getline;print $2;exit}' ${pro_pylibs_dir}/seafevents/seafevents_api.py`

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export ORIG_LD_LIBRARY_PATH=${LD_LIBRARY_PATH}
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}
export CCNET_CONF_DIR=${default_ccnet_conf_dir}
export SEAFILE_CONF_DIR=${default_seafile_data_dir}
export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
export SEAFILE_RPC_PIPE_PATH=${seafile_rpc_pipe_path}
export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
export SEAFES_DIR=$seafesdir
export SEAHUB_DIR=$seahubdir
export SEAFDAV_CONF=${central_config_dir}/seafdav.conf

function check_python_executable() {
    if [[ "$PYTHON" != "" && -x $PYTHON ]]; then
        return 0
    fi

    if which python3 2>/dev/null 1>&2; then
        PYTHON=python3
    elif !(python --version 2>&1 | grep "3\.[0-9]\+\.[0-9]\+") 2>/dev/null 1>&2; then
        echo
        echo "The current version of python is not 3.x.x, please use Python 3.x.x ."
        echo
        exit 1
    else
	# Python 3.8.10
        PYTHON="python"$(python --version | cut -b 8-10)

	if !(which $PYTHON) 2>/dev/null 1>&2; then
            # Python 3.10.4
            PYTHON="python"$(python --version | cut -b 8-11)
	fi
	if !(which $PYTHON) 2>/dev/null 1>&2; then
            echo
            echo "Can't find a python executable of $PYTHON in PATH"
            echo "Install $PYTHON before continue."
            echo "Or if you installed it in a non-standard PATH, set the PYTHON enviroment variable to it"
            echo
            exit 1
        fi
    fi
}

function set_file_config () {
    if [ -z "${ENABLE_FILESERVER}" ]; then
        export ENABLE_FILESERVER=`awk -F '=' '/\[fileserver\]/{a=1}a==1&&$1~/^use_go_fileserver/{print $2;exit}' ${SEAFILE_CENTRAL_CONF_DIR}/seafile.conf`
    fi
    if [ -z "${ENABLE_SEAFDAV}" ]; then
        export ENABLE_SEAFDAV=`awk -F '=' '/\[WEBDAV\]/{a=1}a==1&&$1~/^enabled/{print $2;exit}' ${SEAFILE_CENTRAL_CONF_DIR}/seafdav.conf`
    fi
}

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
        export ENABLE_FILESERVER=${ENABLE_FILESERVER}
        export ENABLE_SEAFDAV=${ENABLE_SEAFDAV}
    fi
}

# log function
function log() {
    local time=$(date +"%F %T")
    echo "[$time] $1 "
}

# check process number
# $1 : process name
function check_process() {
    if [ -z $1 ]; then
        log "Input parameter is empty."
        return 0
    fi

    process_num=$(ps -ef | grep "$1" | grep -v "grep" | wc -l)
    echo $process_num
}

# start
function start_seaf_server() {
    if [[ $IS_PRO_SEAFEVENTS = "True" ]]; then
        LD_LIBRARY_PATH=${SEAFILE_LD_LIBRARY_PATH} ${INSTALLPATH}/seafile/bin/seaf-server \
            -F ${SEAFILE_CENTRAL_CONF_DIR} \
            -c ${CCNET_CONF_DIR} \
            -d ${SEAFILE_CONF_DIR} \
            -l ${TOPDIR}/logs/seafile.log \
            -P ${TOPDIR}/pids/seaf-server.pid \
            -p ${SEAFILE_RPC_PIPE_PATH} \
            -f -L ${TOPDIR} &
    else
        LD_LIBRARY_PATH=${SEAFILE_LD_LIBRARY_PATH} ${INSTALLPATH}/seafile/bin/seaf-server \
            -F ${SEAFILE_CENTRAL_CONF_DIR} \
            -c ${CCNET_CONF_DIR} \
            -d ${SEAFILE_CONF_DIR} \
            -l ${TOPDIR}/logs/seafile.log \
            -P ${TOPDIR}/pids/seaf-server.pid \
            -p ${SEAFILE_RPC_PIPE_PATH} \
            -f &
    fi
    sleep 1
}

function start_fileserver() {
    LD_LIBRARY_PATH=${SEAFILE_LD_LIBRARY_PATH} ${INSTALLPATH}/seafile/bin/fileserver \
        -F ${SEAFILE_CENTRAL_CONF_DIR} \
        -d ${SEAFILE_CONF_DIR} \
        -l ${TOPDIR}/logs/fileserver.log \
        -p ${SEAFILE_RPC_PIPE_PATH} \
        -P ${TOPDIR}/pids/fileserver.pid &
    sleep 1
}

function start_seafevents() {
    check_python_executable;
    $PYTHON -m seafevents.main \
        --config-file ${SEAFILE_CENTRAL_CONF_DIR}/seafevents.conf \
        --logfile ${TOPDIR}/logs/seafevents.log \
        -P ${TOPDIR}/pids/seafevents.pid &
    sleep 1
}

function start_seafdav() {
    check_python_executable;
    SEAFDAV_HOST="0.0.0.0"
    SEAFDAV_PORT=8080
    seafdav_host=`awk -F '=' '/\[WEBDAV\]/{a=1}a==1&&$1~/^host/{print $2;exit}' ${SEAFILE_CENTRAL_CONF_DIR}/seafdav.conf`
    seafdav_port=`awk -F '=' '/\[WEBDAV\]/{a=1}a==1&&$1~/^port/{print $2;exit}' ${SEAFILE_CENTRAL_CONF_DIR}/seafdav.conf`
    if [ $seafdav_host ]; then
        SEAFDAV_HOST=$seafdav_host
    fi
    if [ $seafdav_port ]; then
        SEAFDAV_PORT=$((seafdav_port))
    fi
    $PYTHON -m wsgidav.server.server_cli \
        --server gunicorn \
        --root / \
        --log-file ${TOPDIR}/logs/seafdav.log \
        --pid ${TOPDIR}/pids/seafdav.pid \
        --port ${SEAFDAV_PORT} \
        --host ${SEAFDAV_HOST} &
    sleep 1
}

# monitor
function monitor_seaf_server() {
    process_name="seaf-server"
    check_num=$(check_process $process_name)
    if [ $check_num -eq 0 ]; then
        log "Start $process_name"
        start_seaf_server
    fi
}

function monitor_fileserver() {
    process_name="fileserver"
    check_num=$(check_process $process_name)
    if [ $check_num -eq 0 ]; then
        log "Start $process_name"
        start_fileserver
    fi
}

function monitor_seafevents() {
    process_name="seafevents.main"
    check_num=$(check_process $process_name)
    if [ $check_num -eq 0 ]; then
        log "Start $process_name"
        start_seafevents
    fi
}

function monitor_seafdav() {
    process_name="wsgidav.server.server_cli"
    check_num=$(check_process $process_name)
    if [ $check_num -eq 0 ]; then
        log "Start $process_name"
        start_seafdav
    fi
}


# check enabled
set_file_config

set_env_config;

log "Start Monitor"

while [ 1 ]; do

    monitor_seaf_server

    if [ $ENABLE_FILESERVER ] && [ $ENABLE_FILESERVER = "true" ]; then
        monitor_fileserver
    fi

    if [ $CLUSTER_MODE ] && [ $CLUSTER_MODE = "backend" ]; then
       :
    else
        monitor_seafevents
    fi

    if [ $ENABLE_SEAFDAV ] && [ $ENABLE_SEAFDAV = "true" ]; then
        monitor_seafdav
    fi

    sleep 30
done
