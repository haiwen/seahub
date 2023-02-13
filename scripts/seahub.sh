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
seafesdir=$pro_pylibs_dir/seafes
seahubdir=${INSTALLPATH}/seahub

script_name=$0
function usage () {
    echo "Usage: "
    echo
    echo "  $(basename ${script_name}) { start <port> | stop | restart <port> }"
    echo
    echo "<port> is optional, and defaults to 8000"
    echo ""
}

# Check args
if [[ $1 != "start" && $1 != "stop" && $1 != "restart" \
    && $1 != "clearsessions" && $1 != "python-env" ]]; then
    usage;
    exit 1;
fi

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

function validate_seafile_data_dir () {
    if [[ ! -d ${default_seafile_data_dir} ]]; then
        echo "Error: there is no seafile server data directory."
        echo "Have you run setup-seafile.sh before this?"
        echo ""
        exit 1;
    fi
}

function validate_seahub_running () {
    if pgrep -f "${manage_py}" 2>/dev/null 1>&2; then
        echo "Seahub is already running."
        exit 1;
    elif pgrep -f "seahub.wsgi:application" 2>/dev/null 1>&2; then
        echo "Seahub is already running."
        exit 1;
    fi
}

function validate_port () {
    if ! [[ ${port} =~ ^[1-9][0-9]{1,4}$ ]] ; then
        printf "\033[033m${port}\033[m is not a valid port number\n\n"
        usage;
        exit 1
    fi
}

if [[ ($1 == "start" || $1 == "restart") \
    && ($# == 2 || $# == 1) ]]; then
    if [[ $# == 2 ]]; then
        port=$2
        validate_port
    else
        port=8000
    fi
elif [[ $1 == "stop" && $# == 1 ]]; then
    dummy=dummy
elif [[ $1 == "clearsessions" && $# == 1 ]]; then
    dummy=dummy
elif [[ $1 == "python-env" ]]; then
    dummy=dummy
else
    usage;
    exit 1
fi

function warning_if_seafile_not_running () {
    if ! pgrep -f "seafile-controller -c ${default_ccnet_conf_dir}" 2>/dev/null 1>&2; then
        echo
        echo "Warning: seafile-controller not running. Have you run \"./seafile.sh start\" ?"
        echo
        exit 1
    fi
}

function prepare_seahub_log_dir() {
    logdir=${TOPDIR}/logs
    if ! [[ -d ${logsdir} ]]; then
        if ! mkdir -p "${logdir}"; then
            echo "ERROR: failed to create logs dir \"${logdir}\""
            exit 1
        fi
    fi
    export SEAHUB_LOG_DIR=${logdir}
}

function before_start() {
    prepare_env;
    warning_if_seafile_not_running;
    validate_seahub_running;
    prepare_seahub_log_dir;

    if [[ -d ${INSTALLPATH}/pro ]]; then
        if [[ -z "$LANG" ]]; then
            echo "LANG is not set in ENV, set to en_US.UTF-8"
            export LANG='en_US.UTF-8'
        fi
        if [[ -z "$LC_ALL" ]]; then
            echo "LC_ALL is not set in ENV, set to en_US.UTF-8"
            export LC_ALL='en_US.UTF-8'
        fi

        export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
        export SEAFES_DIR=$seafesdir
        export SEAHUB_DIR=$seahubdir
    fi
}

function start_seahub () {
    before_start;
    echo "Starting seahub at port ${port} ..."
    check_init_admin;

    export DJANGO_SETTINGS_MODULE=seahub.settings
    $PYTHON $gunicorn_exe seahub.wsgi:application -c "${gunicorn_conf}" --preload

    # Ensure seahub is started successfully
    sleep 5
    if ! pgrep -f "seahub.wsgi:application" 2>/dev/null 1>&2; then
        printf "\033[33mError:Seahub failed to start.\033[m\n"
        echo "Please try to run \"./seahub.sh start\" again"
        exit 1;
    fi
    echo
    echo "Seahub is started"
    echo
}

function prepare_env() {
    check_python_executable;
    validate_seafile_data_dir;

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
    export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH


}

function clear_sessions () {
    prepare_env;

    echo "Start clear expired session records ..."
    $PYTHON "${manage_py}" clearsessions

    echo
    echo "Done"
    echo
}

function stop_seahub () {
    if [[ -f ${pidfile} ]]; then
        echo "Stopping seahub ..."
        pkill -f "thirdpart/bin/gunicorn"
        sleep 1
        if pgrep -f "thirdpart/bin/gunicorn" 2>/dev/null 1>&2 ; then
            echo 'Failed to stop seahub.'
            exit 1
        fi
        rm -f ${pidfile}
        return 0
    else
        echo "Seahub is not running"
    fi
}

function check_init_admin() {
    check_init_admin_script=${INSTALLPATH}/check_init_admin.py
    if ! $PYTHON $check_init_admin_script; then
        exit 1
    fi
}

function run_python_env() {
    local pyexec

    prepare_env;

    if [[ -d ${INSTALLPATH}/pro ]]; then
        export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
        export SEAFES_DIR=$seafesdir
        export SEAHUB_DIR=$seahubdir
    fi

    if which ipython 2>/dev/null; then
        pyexec=ipython
    else
        pyexec=$PYTHON
    fi

    if [[ $# -eq 0 ]]; then
        $pyexec "$@"
    else
        "$@"
    fi
}

case $1 in
    "start" )
        start_seahub;
        ;;
    "stop" )
        stop_seahub;
        ;;
    "restart" )
        stop_seahub
        sleep 2
        start_seahub
        ;;
    "python-env")
        shift
        run_python_env "$@"
        ;;
    "clearsessions" )
        clear_sessions
        ;;
esac

echo "Done."
echo ""
