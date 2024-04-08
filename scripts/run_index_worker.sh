SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
central_config_dir=${TOPDIR}/conf
pro_pylibs_dir=${INSTALLPATH}/pro/python
pidfile=${INSTALLPATH}/runtime/index_worker.pid


script_name=$0
function usage () {
    echo "Usage: "
    echo
    echo "  $(basename ${script_name}) { start | stop | restart }"
}

if [[ $1 != "start" && $1 != "stop" && $1 != "restart" ]]; then
    usage;
    exit 1;
fi

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

function prepare_log_dir() {
    logdir=${TOPDIR}/logs
    if ! [[ -d ${logsdir} ]]; then
        if ! mkdir -p "${logdir}"; then
            echo "ERROR: failed to create logs dir \"${logdir}\""
            exit 1
        fi
    fi
    export LOG_DIR=${logdir}
}

function before_start() {
    check_python_executable;
    prepare_log_dir;

    export SEAFILE_CONF_DIR=${default_seafile_data_dir}
    export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
    export SEAFES_DIR=$pro_pylibs_dir/seafes
    export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH
    export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
    export EVENTS_CONFIG_FILE=${SEAFILE_CENTRAL_CONF_DIR}/seafevents.conf
    export INDEX_SLAVE_CONFIG_FILE=${SEAFILE_CENTRAL_CONF_DIR}/index-slave.conf
}

start_index_worker() {
    before_start;
    nohup $PYTHON -m seafes.index_worker --loglevel debug --logfile ${logdir}/index_worker.log start & echo $! > $pidfile
    sleep 2
    if ! pgrep -f "seafes.index_worker" 2>/dev/null 1>&2; then
        printf "\033[33mError:Index worker failed to start.\033[m\n"
        echo "Please try to run \"./run_index_worker.sh start\" again"
        exit 1;
    fi
    echo
    echo "Index worker is started"
    echo
}

stop_index_worker() {
    if [[ -f ${pidfile} ]]; then
        pid=$(cat "${pidfile}")
        echo "Stopping index worker ..."
        kill ${pid}
        rm -f ${pidfile}
        return 0
    else
        echo "Index worker is not running"
    fi
}

case $1 in 
    "start" )
        start_index_worker;
        ;;
    "stop" )
        stop_index_worker;
        ;;
    "restart" )
        stop_index_worker
        sleep 2
        start_index_worker
        ;;
esac
