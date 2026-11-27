#!/bin/bash

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_seafile_data_dir=${TOPDIR}/seafile-data
central_config_dir=${TOPDIR}/conf
pro_pylibs_dir=${INSTALLPATH}/pro/python
seahubdir=${INSTALLPATH}/seahub

# Match the deployment environment used by reset-admin.sh.
if [[ -z "$PYTHON" || ! -x "$PYTHON" ]]; then
    if command -v python3 >/dev/null 2>&1; then
        PYTHON=python3
    elif python --version 2>&1 | grep -q '^Python 3\.'; then
        PYTHON=python
    else
        echo "Error: Python 3 is required. Set PYTHON to its executable path." >&2
        exit 1
    fi
fi

if [[ -z "${JWT_PRIVATE_KEY}" ]]; then
    if [[ ! -f "${central_config_dir}/.env" ]]; then
        echo "Error: .env file not found. Please follow the upgrade manual to set it up." >&2
        exit 1
    fi

    set -a
    source "${central_config_dir}/.env" || exit 1
    set +a

    if [[ -z "${JWT_PRIVATE_KEY}" ]]; then
        echo "Error: JWT_PRIVATE_KEY not found in .env file." >&2
        exit 1
    fi

    export SEAFILE_MYSQL_DB_CCNET_DB_NAME=${SEAFILE_MYSQL_DB_CCNET_DB_NAME:-ccnet_db}
    export SEAFILE_MYSQL_DB_SEAFILE_DB_NAME=${SEAFILE_MYSQL_DB_SEAFILE_DB_NAME:-seafile_db}
    export SEAFILE_MYSQL_DB_SEAHUB_DB_NAME=${SEAFILE_MYSQL_DB_SEAHUB_DB_NAME:-seahub_db}
    export SITE_ROOT=${SITE_ROOT:-/}
fi

if [[ ! -d "${default_seafile_data_dir}" ]]; then
    echo "Error: there is no seafile server data directory." >&2
    exit 1
fi

export SEAHUB_LOG_DIR=${TOPDIR}/logs
mkdir -p "${SEAHUB_LOG_DIR}" || exit 1

export SEAFILE_DATA_DIR=${default_seafile_data_dir}
export SEAFILE_CENTRAL_CONF_DIR=${central_config_dir}
export PYTHONPATH=${INSTALLPATH}/seafile/lib/python3/site-packages:${INSTALLPATH}/seafile/lib64/python3/site-packages:${seahubdir}/thirdpart:$PYTHONPATH
export SEAFILE_RPC_PIPE_PATH=${INSTALLPATH}/runtime
export SEAHUB_DIR=$seahubdir

if [[ -d "${INSTALLPATH}/pro" ]]; then
    export PYTHONPATH=$PYTHONPATH:$pro_pylibs_dir
    export SEAFES_DIR=${pro_pylibs_dir}/seafes
fi

exec "$PYTHON" "${seahubdir}/manage.py" changepassword --system-admin "$@"
