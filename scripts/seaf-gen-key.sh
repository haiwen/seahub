#!/bin/bash

echo ""

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
seaf_genkey=${INSTALLPATH}/seafile/bin/seaf-gen-key
seaf_genkey_opts=""

export PATH=${INSTALLPATH}/seafile/bin:$PATH
export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}

script_name=$0
function usage () {
    echo "usage : "
    echo -e "$(basename ${script_name})\n" \
        "-p <file path to write key iv, default ./seaf-key.txt>"
    echo ""
}

function run_seaf_genkey () {
    echo "Starting seaf-gen-key, please wait ..."

    LD_LIBRARY_PATH=$SEAFILE_LD_LIBRARY_PATH ${seaf_genkey} \
        ${seaf_genkey_opts}

    echo "seaf-gen-key run done"
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

seaf_genkey_opts=$@
run_seaf_genkey;

echo "Done."
