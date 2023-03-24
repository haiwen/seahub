#!/bin/bash

########
### This script is a wrapper for setup-seafile-mysql.py
########

set -e

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")

cd "$INSTALLPATH"

python_script=setup-seafile-mysql.py

function err_and_quit () {
    printf "\n\n\033[33mError occured during setup. \nPlease fix possible problems and run the script again.\033[m\n\n"
    exit 1;
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
        err_and_quit
    else
        PYTHON="python"$(python --version | cut -b 8-10)
        if !which $PYTHON 2>/dev/null 1>&2; then
            echo
            echo "Can't find a python executable of $PYTHON in PATH"
            echo "Install $PYTHON before continue."
            echo "Or if you installed it in a non-standard PATH, set the PYTHON enviroment variable to it"
            echo
            err_and_quit
        fi
    fi
}

function check_python () {
    echo "Checking python on this machine ..."
    check_python_executable
    echo
}

check_python;

export PYTHON=$PYTHON

export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${INSTALLPATH}/seahub/thirdpart:$PYTHONPATH

exec $PYTHON "$python_script" "$@"
