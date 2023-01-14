#!/bin/bash

# This is a wrapper shell script for the real seaf-backup command.
# It prepares necessary environment variables and exec the real script.

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

check_python_executable

# seafile cli client requires the argparse module
if ! $PYTHON -c 'import argparse' 2>/dev/null 1>&2; then
    echo
    echo "Python argparse module is required"
    echo "see [https://pypi.python.org/pypi/argparse]"
    echo
    exit 1
fi

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
central_config_dir=${TOPDIR}/conf
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data


function validate_seafile_data_dir () {
    if [[ ! -d ${default_seafile_data_dir} ]]; then
        echo "Error: there is no seafile server data directory."
        echo "Have you run setup-seafile.sh before this?"
        echo ""
        exit 1;
    fi
}

validate_seafile_data_dir

SEAFILE_PYTHON_PATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub/thirdpart

SEAF_BACKUP_CMD=${INSTALLPATH}/seaf-backup-cmd.py

export SEAFILE_RPC_PIPE_PATH=${INSTALLPATH}/runtime
export PYTHONPATH=${SEAFILE_PYTHON_PATH}:${PYTHONPATH}
export CCNET_CONF_DIR=${default_ccnet_conf_dir}
export SEAFILE_CONF_DIR=${default_seafile_data_dir}
export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
$PYTHON ${SEAF_BACKUP_CMD} "$@"
