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

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export ORIG_LD_LIBRARY_PATH=${LD_LIBRARY_PATH}
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}

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

# monitor
function monitor_notification_server() {
    process_name="notification-server"
    check_num=$(check_process $process_name)
    if [ $check_num -eq 0 ]; then
        log "Start $process_name"
        start_notification_server
    fi
}

# check enabled
ENABLE_NOTIFICATION_SERVER=`awk -F '=' '/\[notification\]/{a=1}a==1&&$1~/^enabled/{print $2;exit}' ${central_config_dir}/seafile.conf`

log "Start Monitor"

while [ 1 ]; do
    if [ $ENABLE_NOTIFICATION_SERVER ] && [ $ENABLE_NOTIFICATION_SERVER = "true" ]; then
        monitor_notification_server
    fi

    sleep 30
done
