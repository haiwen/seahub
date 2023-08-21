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
    /usr/bin/python3 -m seafevents.main --config-file ${central_config_dir}/seafevents.conf --logfile ${TOPDIR}/logs/seafevents.log -P ${TOPDIR}/pids/seafevents.pid &
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

log "Start Monitor"

while [ 1 ]; do

    monitor_seafevents

    if [ $ENABLE_NOTIFICATION_SERVER ] && [ $ENABLE_NOTIFICATION_SERVER = "true" ]; then
        monitor_notification_server
    fi

    sleep 30
done
