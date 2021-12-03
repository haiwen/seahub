#!/bin/bash

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
default_conf_dir=${TOPDIR}/conf
seaf_gc=${INSTALLPATH}/seafile/bin/seafserv-gc
seaf_gc_opts=""

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}

script_name=$0
function usage () {
    echo "usage : "
    echo "$(basename ${script_name}) [--dry-run | -D] [--rm-deleted | -r] [repo-id1] [repo-id2]"
    echo ""
}


function validate_seafile_data_dir () {
    if [[ ! -d ${default_seafile_data_dir} ]]; then
        echo "Error: there is no seafile server data directory."
        echo "Have you run setup-seafile.sh before this?"
        echo ""
        exit 1;
    fi
}

function check_component_running() {
    name=$1
    cmd=$2
    if pid=$(pgrep -f "$cmd" 2>/dev/null); then
        echo "[$name] is running, pid $pid. You can stop it by: "
        echo
        echo "        kill $pid"
        echo
        echo "Stop it and try again."
        echo
        exit
    fi
}

function validate_already_running () {
    if pid=$(pgrep -f "seafile-controller -c ${default_ccnet_conf_dir}" 2>/dev/null); then
        echo "seafile server is still running, stop it by \"seafile.sh stop\""
        echo
        exit 1;
    fi

    check_component_running "seaf-server" "seaf-server -c ${default_ccnet_conf_dir}"
    check_component_running "fileserver" "fileserver -c ${default_ccnet_conf_dir}"
    check_component_running "seafdav" "wsgidav.server.server_cli"
}

function run_seaf_gc () {
    validate_already_running;
    validate_seafile_data_dir;

    echo "Starting seafserv-gc, please wait ..."

    LD_LIBRARY_PATH=$SEAFILE_LD_LIBRARY_PATH ${seaf_gc} \
        -c "${default_ccnet_conf_dir}" \
        -d "${default_seafile_data_dir}" \
        -F "${default_conf_dir}" \
        ${seaf_gc_opts}

    echo "seafserv-gc run done"
    echo
}

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

seaf_gc_opts=$@
run_seaf_gc;

echo "Done."
