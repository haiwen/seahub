#!/bin/bash

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
central_config_dir=${TOPDIR}/conf
seaf_controller="${INSTALLPATH}/seafile/bin/seafile-controller"
pro_pylibs_dir=${INSTALLPATH}/pro/python
seafesdir=$pro_pylibs_dir/seafes
seahubdir=${INSTALLPATH}/seahub
seafile_rpc_pipe_path=${INSTALLPATH}/runtime

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

function set_jwt_private_key () {
    if [[ -z "${JWT_PRIVATE_KEY}" && -z "${SITE_ROOT}" && ! -e "${central_config_dir}/.env" ]]; then
        echo "Error: .env file not found."
        echo "Please follow the upgrade manual to set the .env file."
        echo ""
        exit -1;
    fi

    if [ -z "${JWT_PRIVATE_KEY}" ]; then
        jwt_key=`awk -F'=' '/JWT_PRIVATE_KEY/ {print $2}' ${central_config_dir}/.env`
        export JWT_PRIVATE_KEY=$jwt_key
    fi
    if [ -z "${SITE_ROOT}" ]; then
        site_root=`awk -F'=' '/SITE_ROOT/ {print $2}' ${central_config_dir}/.env`
        export SITE_ROOT=$site_root
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
function start_notification_server() {
    notification-server -c ${central_config_dir} -l ${TOPDIR}/logs/notification-server.log &
    sleep 1
}

function start_seafevents() {
    check_python_executable;
    $PYTHON -m seafevents.main --config-file ${central_config_dir}/seafevents.conf --logfile ${TOPDIR}/logs/seafevents.log -P ${TOPDIR}/pids/seafevents.pid &
    sleep 1
}

# monitor
function monitor_notification_server() {
    process_name="notification-server"
    check_num=$(check_process $process_name)
    if [ $check_num -eq 0 ]; then
        log "Start $process_name"
        start_notification_server
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

# check enabled
ENABLE_NOTIFICATION_SERVER=`awk -F '=' '/\[notification\]/{a=1}a==1&&$1~/^enabled/{print $2;exit}' ${central_config_dir}/seafile.conf`
IS_PRO_SEAFEVENTS=`awk '/is_pro/{getline;print $2;exit}' ${pro_pylibs_dir}/seafevents/seafevents_api.py`

set_jwt_private_key;

log "Start Monitor"

while [ 1 ]; do

    if [ $CLUSTER_MODE ] && [ $CLUSTER_MODE = "backend" ]; then
       :
    else
        monitor_seafevents
    fi

    if [ $ENABLE_NOTIFICATION_SERVER ] && [ $ENABLE_NOTIFICATION_SERVER = "true" ]; then
        monitor_notification_server
    fi

    sleep 30
done
