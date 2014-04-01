#!/bin/bash
#
#
#

function usage() {
    echo
    echo "    Seahub project code checker."
    echo
    echo "    It runs pylint on the code and prints the result."
    echo
    echo "    To check a file:"
    echo
    echo "      ./code-check.sh seahub.views.file"
    echo
    echo "    To check a module:"
    echo
    echo "      ./code-check.sh seahub.views"
    echo
}

if [[ $# == 0 ]]; then
    usage;
    exit 1
fi

if [[ $# == 1 ]]; then
    if [[ $1 == "-h" || $1 == "--help" ]]; then
        usage;
        exit 1
    fi
fi

SCRIPT=$(readlink -f "$0")
PROJECT_DIR=$(dirname "${SCRIPT}")

cd ${PROJECT_DIR}

if ! which pylint 2>/dev/null 1>&2; then
    echo
    echo "Pylint not found. Please install it first by:"
    echo
    echo "      sudo pip install pylint"
    echo
    exit 1
fi

pylintrc=${PROJECT_DIR}/pylintrc
if ! [[ -f ${pylintrc} ]]; then
    echo "${pylintrc} not found"
    echo 
    echo "mv pylintrc.template pylintrc"
    echo
    
    exit 1
fi

pylint --rcfile=${pylintrc} -E $@
