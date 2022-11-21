#!/bin/bash

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
default_conf_dir=${TOPDIR}/conf
seafile_rpc_pipe_path=${INSTALLPATH}/runtime
migrate=${INSTALLPATH}/migrate-repo.py

script_name=$0
function usage () {
    echo "usage : "
    echo "    ./$(basename ${script_name})" \
         "[repo id to migrate]" \
         "<origin storage id>" \
         "<destination storage id>"
    echo""
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

function do_migrate () {
    export CCNET_CONF_DIR=${default_ccnet_conf_dir}
    export SEAFILE_CONF_DIR=${default_seafile_data_dir}
    export SEAFILE_CENTRAL_CONF_DIR=${default_conf_dir}
    export SEAFILE_RPC_PIPE_PATH=${seafile_rpc_pipe_path}
    export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH
    $PYTHON ${migrate} $@
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

if [ $# -ne 3 ] && [ $# -ne 2 ];
then
    usage;
    exit 1;
fi

do_migrate $@;

echo "Done."
