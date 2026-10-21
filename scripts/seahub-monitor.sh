#!/bin/bash

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
central_config_dir=${TOPDIR}/conf
seafile_rpc_pipe_path=${INSTALLPATH}/runtime
pro_pylibs_dir=${INSTALLPATH}/pro/python
seafesdir=${pro_pylibs_dir}/seafes
seahubdir=${INSTALLPATH}/seahub
gunicorn_conf=${TOPDIR}/conf/gunicorn.conf.py
gunicorn_exe=${INSTALLPATH}/seahub/thirdpart/bin/gunicorn
logfile=${TOPDIR}/logs/seahub-monitor.log

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export ORIG_LD_LIBRARY_PATH=${LD_LIBRARY_PATH}
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}
export SEAFILE_DATA_DIR=${TOPDIR}/seafile-data
export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
export SEAFILE_RPC_PIPE_PATH=${seafile_rpc_pipe_path}
export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
export SEAFES_DIR=${seafesdir}
export SEAHUB_DIR=${seahubdir}
export SEAHUB_LOG_DIR=${TOPDIR}/logs

function set_env_config() {
    if [[ -z "${JWT_PRIVATE_KEY}" ]]; then
        if [[ ! -e "${central_config_dir}/.env" ]]; then
            echo "Error: .env file not found."
            exit 1
        fi
        set -a
        source "${central_config_dir}/.env"
        set +a
    fi
}

function check_python_executable() {
    if [[ -n "${PYTHON}" && -x "${PYTHON}" ]]; then
        return
    fi
    if which python3 >/dev/null 2>&1; then
        PYTHON=python3
    elif python --version 2>&1 | grep -q "3\.[0-9]\+\.[0-9]\+"; then
        PYTHON=python
    else
        echo "Can't find a Python 3 executable in PATH" >&2
        exit 1
    fi
}

function is_seahub_running() {
    pgrep -f '[s]eahub.wsgi:application' >/dev/null 2>&1
}

function start_seahub() {
    export DJANGO_SETTINGS_MODULE=seahub.settings
    ${PYTHON} ${gunicorn_exe} seahub.wsgi:application -c "${gunicorn_conf}" --preload &
    sleep 5
    if ! is_seahub_running; then
        log "Seahub failed to restart"
        return 1
    fi
}

function log() {
    local timestamp=$(date +"%F %T")
    if [[ ${SEAFILE_LOG_TO_STDOUT} == "true" || ${MONITOR_LOG_FD_OPEN} != "true" ]]; then
        echo "[${timestamp}] $1"
    else
        echo "[${timestamp}] $1" >&3
    fi
}

function reopen_monitor_log() {
    [[ ${SEAFILE_LOG_TO_STDOUT} == "true" ]] && return
    exec 3>&-
    if exec 3>>"${logfile}"; then
        MONITOR_LOG_FD_OPEN=true
    else
        MONITOR_LOG_FD_OPEN=false
        echo "Failed to reopen ${logfile}" >&2
    fi
}

function run_monitor() {
    if [[ ${SEAFILE_LOG_TO_STDOUT} != "true" ]]; then
        MONITOR_LOG_FD_OPEN=false
        reopen_monitor_log
        trap reopen_monitor_log USR1
    fi
    trap 'exit 0' TERM INT

    set_env_config
    check_python_executable
    log "Start Seahub Monitor"
    while true; do
        if ! is_seahub_running; then
            log "Start seahub.wsgi:application"
            start_seahub
        fi
        sleep 30
    done
}

run_monitor
