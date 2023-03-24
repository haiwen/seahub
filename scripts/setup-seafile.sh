#!/bin/bash

SCRIPT=$(readlink -f "$0")
INSTALLPATH=$(dirname "${SCRIPT}")
TOPDIR=$(dirname "${INSTALLPATH}")
default_ccnet_conf_dir=${TOPDIR}/ccnet
default_seafile_data_dir=${TOPDIR}/seafile-data
default_seahub_db=${TOPDIR}/seahub.db
default_conf_dir=${TOPDIR}/conf
default_pids_dir=${TOPDIR}/pids
default_logs_dir=${TOPDIR}/logs

export SEAFILE_LD_LIBRARY_PATH=${INSTALLPATH}/seafile/lib/:${INSTALLPATH}/seafile/lib64:${LD_LIBRARY_PATH}

server_manual_http='https://download.seafile.com/published/seafile-manual/home.md'

function welcome () {
    echo "-----------------------------------------------------------------"
    if [[ -d ${INSTALLPATH}/pro ]]; then
        echo "This script will guide you to config and setup your seafile professional server."
    else
        echo "This script will guide you to config and setup your seafile server."
    fi
    echo -e "\nMake sure you have read seafile server manual at \n\n\t${server_manual_http}\n"
    echo -e "Note: This script will guide your to setup seafile server using sqlite3,"
    echo "which may have problems if your disk is on a NFS/CIFS/USB."
    echo "In these cases, we suggest you setup seafile server using MySQL."
    echo
    echo "Press [ENTER] to continue"
    echo "-----------------------------------------------------------------"
    read dummy
    echo
}

function err_and_quit () {
    printf "\n\n\033[33mError occured during setup. \nPlease fix possible issues and run the script again.\033[m\n\n"
    exit 1;
}

function on_ctrl_c_pressed () {
    printf "\n\n\033[33mYou have pressed Ctrl-C. Setup is interrupted.\033[m\n\n" 
    exit 1;
}

# clean newly created ccnet/seafile configs when exit on SIGINT 
trap on_ctrl_c_pressed 2

function check_sanity () {
    if ! [[ -d ${INSTALLPATH}/seahub && -d ${INSTALLPATH}/seafile \
        && -d ${INSTALLPATH}/runtime ]]; then
        echo
        echo "The seafile-server diretory doesn't contain all needed files."    
        echo "Please make sure you have extracted all files and folders from tarball."
        err_and_quit;
    fi
}

function read_yes_no () {
    printf "[yes|no] "
    read yesno;
    while [[ "${yesno}" != "yes" && "${yesno}" != "no" ]]
    do
        printf "please answer [yes|no] "
        read yesno;
    done

    if [[ "${yesno}" == "no" ]]; then
        return 1;
    else
        return 0;
    fi
}

function check_existing_ccnet () {
    if [[ -d ${default_ccnet_conf_dir} ]]; then
        echo "\033[31m Error: \033[0m Ccnet config dir \"${default_ccnet_conf_dir}\" already exists."
        echo
        exit 1;
    fi
    echo
}

function check_existing_seafile () {
    if [[ -d ${default_seafile_data_dir} ]]; then
        echo "\033[31m Error: \033[0m Seafile server data dir \"${default_seafile_data_dir}\" already exists."
        echo
        exit 1;
    fi
    echo
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

    echo "Find python: $PYTHON"
    echo
}

function check_python_module () {
    module=$1 
    name=$2
    hint=$3
    printf "  Checking python module: ${name} ... " 
    if ! $PYTHON -c "import ${module}" 2>/dev/null 1>&2; then
        echo
        printf "\033[33m ${name} \033[m is not installed, Please install it first.\n"
        if [[ "${hint}" != "" ]]; then
            printf "${hint}"
            echo
        fi
        err_and_quit;
    fi
    echo -e "Done."
}

function check_python () {
    echo "Checking python on this machine ..."
    check_python_executable
    check_python_module sqlite3 python-sqlite3
    echo
}

function check_sqlite3 () {
    echo -n "Checking for sqlite3 ..."
    if ! which sqlite3 2>/dev/null 1>&2; then
        echo -e "\nSqlite3 is not found. install it first.\n"
        echo "On Debian/Ubuntu:     apt-get install sqlite3"
        echo "On CentOS/RHEL:       yum install sqlite"
        err_and_quit;
    fi
    printf "Done.\n\n"
}

function check_system_dependency () {
    printf "Checking packages needed by seafile ...\n\n"
    check_python;
    check_sqlite3;

    printf "Checking Done.\n\n"
}

function ask_question () {
    question=$1
    default=$2
    key=$3
    printf "${question}"
    printf "\n"
    if [[ "${default}" != "" && "${default}" != "nodefault" ]] ; then
        printf "[default: ${default} ] "
    elif [[ "${key}" != "" ]]; then
        printf "[${key}]: "
    fi
}
    
function get_server_name () {
    question="What would you like to use as the name of this seafile server?\nYour seafile users will be able to see the name in their seafile client."
    hint="You can use a-z, A-Z, 0-9, _ and -, and the length should be 3 ~ 15"
    ask_question "${question}\n${hint}" "nodefault" "server name"
    read server_name
    if [[ "${server_name}" == "" ]]; then
        echo
        echo "server name cannot be empty"
        get_server_name
    elif [[ ! ${server_name} =~ ^[a-zA-Z0-9_-]{3,14}$ ]]; then
        printf "\n\033[33m${server_name}\033[m is not a valid name.\n"
        get_server_name;
    fi
    echo
}

function get_server_ip_or_domain () {
    question="What is the ip or domain of this server?\nFor example, www.mycompany.com, or, 192.168.1.101" 
    ask_question "${question}\n" "nodefault" "This server's ip or domain"
    read ip_or_domain
    if [[ "${ip_or_domain}" == "" ]]; then
        echo
        echo "ip or domain cannot be empty"
        get_server_ip_or_domain
    fi
    echo
}

# function get_ccnet_server_port () {
#     question="What tcp port do you want to use for ccnet server?" 
#     hint="10001 is the recommended port."
#     default="10001"
#     ask_question "${question}\n${hint}" "${default}"
#     read server_port
#     if [[ "${server_port}" == "" ]]; then
#         server_port="${default}"
#     fi
#     if [[ ! ${server_port} =~ ^[0-9]+$ ]]; then
#         echo "\"${server_port}\" is not a valid port number. "
#         get_ccnet_server_port
#     fi
#     echo
# }

# function get_seafile_server_port () {
#     question="What tcp port would you like to use for seafile server?" 
#     hint="12001 is the recommended port."
#     default="12001"
#     ask_question "${question}\n${hint}" "${default}"
#     read seafile_server_port
#     if [[ "${seafile_server_port}" == "" ]]; then
#         seafile_server_port="${default}"
#     fi
#     if [[ ! ${seafile_server_port} =~ ^[0-9]+$ ]]; then
#         echo "\"${seafile_server_port}\" is not a valid port number. "
#         get_seafile_server_port
#     fi
#     echo
# }

function get_fileserver_port () {
    question="What tcp port do you want to use for seafile fileserver?" 
    hint="8082 is the recommended port."
    default="8082"
    ask_question "${question}\n${hint}" "${default}"
    read fileserver_port
    if [[ "${fileserver_port}" == "" ]]; then
        fileserver_port="${default}"
    fi
    if [[ ! ${fileserver_port} =~ ^[0-9]+$ ]]; then
        echo "\"${fileserver_port}\" is not a valid port number. "
        get_fileserver_port
    fi
    echo
}


# function get_seafile_data_dir () {
#     question="Where would you like to store your seafile data?"
#     note="Please use a volume with enough free space." 
#     default=${default_seafile_data_dir}
#     ask_question "${question} \n\033[33mNote: \033[m${note}" "${default}"
#     read seafile_data_dir
#     if [[ "${seafile_data_dir}" == "" ]]; then
#         seafile_data_dir=${default}
#     fi
#
#     if [[ -d ${seafile_data_dir} && -f ${seafile_data_dir}/seafile.conf ]]; then
#         echo
#         echo "It seems that you have already existing seafile data in ${seafile_data_dir}."
#         echo "Would you like to use the existing seafile data?"
#         if ! read_yes_no; then
#             echo "You have chosen not to use existing seafile data in ${seafile_data_dir}"
#             echo "You need to specify a different seafile data directory or remove ${seafile_data_dir} before continuing."
#             get_seafile_data_dir
#         else
#             use_existing_seafile="true"
#         fi
#     elif [[ -d ${seafile_data_dir} && $(ls -A ${seafile_data_dir}) != "" ]]; then
#         echo 
#         echo "${seafile_data_dir} is an existing non-empty directory. Please specify a different directory"
#         echo 
#         get_seafile_data_dir
#     elif [[ ! ${seafile_data_dir} =~ ^/ ]]; then
#         echo 
#         echo "\"${seafile_data_dir}\" is not an absolute path. Please specify an absolute path."
#         echo 
#         get_seafile_data_dir
#     elif [[ ! -d $(dirname ${seafile_data_dir}) ]]; then
#         echo 
#         echo "The path $(dirname ${seafile_data_dir}) does not exist."
#         echo 
#         get_seafile_data_dir
#     fi
#     echo
# }

function gen_ccnet_conf () {
    mkdir -p ${default_conf_dir}
    ccnet_conf=${default_conf_dir}/ccnet.conf
    if ! $(cat > ${ccnet_conf} <<EOF
[General]
EOF
); then
    echo "failed to generate ccnet.conf";
    err_and_quit
fi

mkdir -p ${default_ccnet_conf_dir}
}

function gen_seafile_conf () {
    mkdir -p ${default_conf_dir}
    seafile_conf=${default_conf_dir}/seafile.conf
    if ! $(cat > ${seafile_conf} <<EOF
[fileserver]
port=$fileserver_port
EOF
); then
    echo "failed to generate seafile.conf";
    err_and_quit
fi

mkdir -p ${default_seafile_data_dir}
}

function gen_gunicorn_conf () {
    mkdir -p ${default_conf_dir}
    gunicorn_conf=${default_conf_dir}/gunicorn.conf.py
    if ! $(cat > ${gunicorn_conf} <<EOF
import os

daemon = True
workers = 5

# default localhost:8000
bind = "127.0.0.1:8000"

# Pid
pids_dir = '$default_pids_dir'
pidfile = os.path.join(pids_dir, 'seahub.pid')

# for file upload, we need a longer timeout value (default is only 30s, too short)
timeout = 1200

limit_request_line = 8190
EOF
); then
    echo "failed to generate gunicorn.conf.py";
    err_and_quit
fi
}

function gen_seafdav_conf () {
    mkdir -p ${default_conf_dir}
    seafdav_conf=${default_conf_dir}/seafdav.conf
    if ! $(cat > ${seafdav_conf} <<EOF
[WEBDAV]
enabled = false
port = 8080
share_name = /
EOF
); then
    echo "failed to generate seafdav.conf";
    err_and_quit
fi
}

function copy_user_manuals() {
    src_docs_dir=${INSTALLPATH}/seafile/docs/
    library_template_dir=${default_seafile_data_dir}/library-template
    mkdir -p ${library_template_dir}
    cp -f ${src_docs_dir}/*.doc ${library_template_dir}
}

function parse_params() {
    while getopts n:i:p arg; do
        case $arg in
            n)
                server_name=${OPTARG}
                ;;
            i)
                ip_or_domain=${OPTARG}
                ;;
            p)
                fileserver_port=${OPTARG}
                ;;
        esac
    done
}

function validate_params() {
    # server_name default hostname -s
    if [[ "$server_name" == "" ]]; then
        server_name=${SERVER_NAME:-`hostname -s`}
    fi
    if [[ ! ${server_name} =~ ^[a-zA-Z0-9_-]{3,14}$ ]]; then
        echo "Invalid server name param"
        err_and_quit;
    fi

    # ip_or_domain default hostname -i
    if [[ "$ip_or_domain" == "" ]]; then
        ip_or_domain=${SERVER_IP:-`hostname -i`}
    fi
    if [[ "$ip_or_domain" != "" && ! ${ip_or_domain} =~ ^[^.].+\..+[^.]$ ]]; then
        echo "Invalid ip or domain param"
        err_and_quit;
    fi

    # fileserver_port default 8082
    if [[ "${fileserver_port}" == "" ]]; then
        fileserver_port=${FILESERVER_PORT:-8082}
    fi
    if [[ ! ${fileserver_port} =~ ^[0-9]+$ ]]; then
        echo "Invalid fileserver port param"
        err_and_quit;
    fi
}

function usage() {
    echo "auto mode:"
    echo -e "$0 auto\n" \
        "-n server name\n" \
        "-i ip or domain\n" \
        "-p fileserver port\n" \
        "-d seafile dir to store seafile data"
    echo ""
    echo "interactive mode:"
    echo "$0"
}

# -------------------------------------------
# Main workflow of this script 
# -------------------------------------------

for param in $@; do
    if [[ "$param" == "-h" || "$param" == "--help" ]]; then
        usage;
        exit 0
    fi
done

need_pause=1
if [[ $# -ge 1 && "$1" == "auto" ]]; then
    # auto mode, no pause
    shift
    parse_params $@;
    validate_params;
    need_pause=0
fi

check_sanity;
if [[ "${need_pause}" == "1" ]]; then
    welcome;
fi
sleep .5
check_system_dependency;
sleep .5

check_existing_ccnet;
check_existing_seafile;

if [[ "${server_name}" == "" ]]; then
    get_server_name;
fi

if [[ "${ip_or_domain}" == "" ]]; then
    get_server_ip_or_domain;
fi

if [[ "$fileserver_port" == "" ]]; then
    get_fileserver_port
fi


sleep .5

printf "\nThis is your config information:\n\n"

printf "server name:        \033[33m${server_name}\033[m\n"
printf "server ip/domain:   \033[33m${ip_or_domain}\033[m\n"


printf "seafile data dir:   \033[33m${default_seafile_data_dir}\033[m\n"
printf "fileserver port:    \033[33m${fileserver_port}\033[m\n"


if [[ "${need_pause}" == "1" ]]; then
    echo
    echo "If you are OK with the configuration, press [ENTER] to continue."
    read dummy
fi


# -------------------------------------------
# Create ccnet conf 
# -------------------------------------------

echo "Generating ccnet configuration in ${default_ccnet_conf_dir}..."
echo

gen_ccnet_conf;

echo

# -------------------------------------------
# Create seafile conf
# -------------------------------------------

echo "Generating seafile configuration in ${default_seafile_data_dir} ..."
echo

gen_seafile_conf;

echo

# -------------------------------------------
# Generate gunicorn.conf.py
# -------------------------------------------

gen_gunicorn_conf;

# -------------------------------------------
# Generate seafevents.conf
# -------------------------------------------

gen_seafdav_conf;

# -------------------------------------------
# generate seahub/settings.py
# -------------------------------------------
dest_settings_py=${TOPDIR}/conf/seahub_settings.py
seahub_secret_keygen=${INSTALLPATH}/seahub/tools/secret_key_generator.py

if [[ ! -f ${dest_settings_py} ]]; then
    key=$($PYTHON "${seahub_secret_keygen}")
    cat > ${dest_settings_py} <<EOF
# -*- coding: utf-8 -*-
SECRET_KEY = "$key"

SERVICE_URL = "http://$ip_or_domain/"

EOF
fi

# -------------------------------------------
# Seahub related config
# -------------------------------------------
if [[ "${need_pause}" == "1" ]]; then
    echo "-----------------------------------------------------------------"
    echo "Seahub is the web interface for seafile server."
    echo "Now let's setup seahub configuration. Press [ENTER] to continue"
    echo "-----------------------------------------------------------------"
    echo
    read dummy
fi

# echo "Please specify the email address and password for the seahub administrator."
# echo "You can use them to login as admin on your seahub website."
# echo

function get_seahub_admin_email () {
    question="Please specify the email address for the seahub administrator:"
    ask_question "${question}" "nodefault" "seahub admin email"
    read seahub_admin_email
    if [[ "${seahub_admin_email}" == "" ]]; then
        echo "Seahub admin user name cannot be empty."
        get_seahub_admin_email;
    elif [[ ! ${seahub_admin_email} =~ ^.+@.*\..+$ ]]; then
        echo "${seahub_admin_email} is not a valid email address"
        get_seahub_admin_email;
    fi
}

function get_seahub_admin_passwd () {
    echo
    question="Please specify the password you would like to use for seahub administrator:"
    ask_question "${question}" "nodefault" "seahub admin password"
    read -s seahub_admin_passwd
    echo
    question="Please enter the password again:"
    ask_question "${question}" "nodefault" "seahub admin password again"
    read -s seahub_admin_passwd_again
    echo
    if [[ "${seahub_admin_passwd}" != "${seahub_admin_passwd_again}" ]]; then
        printf "\033[33mThe passwords didn't match.\033[m"
        get_seahub_admin_passwd;
    elif [[ "${seahub_admin_passwd}" == "" ]]; then
        echo "Password cannot be empty."
        get_seahub_admin_passwd;
    fi
}
    
# get_seahub_admin_email;
# sleep .5;
# get_seahub_admin_passwd;
# seahub_admin_passwd_enc=$(echo -n ${seahub_admin_passwd} | sha1sum | grep -o "[0-9a-f]*")
# sleep .5;

# printf "\n\n"
# echo "This is your seahub admin username/password"
# echo
# printf "admin username:         \033[33m${seahub_admin_email}\033[m\n"
# printf "admin password:         \033[33m**************\033[m\n\n"

# echo
# echo "If you are OK with the configuration, press [ENTER] to continue."
# read dummy

# usermgr_db_dir=${default_ccnet_conf_dir}/PeerMgr/
# usermgr_db=${usermgr_db_dir}/usermgr.db

# if [[ "${use_existing_ccnet}" != "true" ]]; then
#     # create admin user/passwd entry in ccnet db
#     if ! mkdir -p "${usermgr_db_dir}"; then
#         echo "Failed to create seahub admin."
#         err_and_quit;
#     fi
    
#     sql="CREATE TABLE IF NOT EXISTS EmailUser (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, email TEXT, passwd TEXT, is_staff bool NOT NULL, is_active bool NOT NULL, ctime INTEGER)";

#     if ! sqlite3 "${usermgr_db}" "${sql}" ; then
#         rm -f "${usermgr_db}"
#         echo "Failed to create seahub admin."
#         err_and_quit;
#     fi
    
#     sql="INSERT INTO EmailUser(email, passwd, is_staff, is_active, ctime) VALUES (\"${seahub_admin_email}\", \"${seahub_admin_passwd_enc}\", 1, 1, 0);"

#     if ! sqlite3 "${usermgr_db}" "${sql}" ; then
#         rm -f "${usermgr_db}"
#         echo "Failed to create seahub admin."
#         err_and_quit;
#     fi
# fi

echo "Creating database now, it may take one minute, please wait... "
echo

cd ${TOPDIR}/ccnet && mkdir -m 0755 GroupMgr misc OrgMgr PeerMgr && cd -

ccnet_group_db=${TOPDIR}/ccnet/GroupMgr/groupmgr.db
ccnet_group_sql=${INSTALLPATH}/sql/sqlite/groupmgr.sql
if ! sqlite3 ${ccnet_group_db} ".read ${ccnet_group_sql}" 2>/dev/null 1>&2; then
    echo "Failed to sync ccnet groupmgr database."
    err_and_quit;
fi

ccnet_config_db=${TOPDIR}/ccnet/misc/config.db
ccnet_config_sql=${INSTALLPATH}/sql/sqlite/config.sql
if ! sqlite3 ${ccnet_config_db} ".read ${ccnet_config_sql}" 2>/dev/null 1>&2; then
    echo "Failed to sync ccnet config database."
    err_and_quit;
fi

ccnet_org_db=${TOPDIR}/ccnet/OrgMgr/orgmgr.db
ccnet_org_sql=${INSTALLPATH}/sql/sqlite/org.sql
if ! sqlite3 ${ccnet_org_db} ".read ${ccnet_org_sql}" 2>/dev/null 1>&2; then
    echo "Failed to sync ccnet org database."
    err_and_quit;
fi

ccnet_user_db=${TOPDIR}/ccnet/PeerMgr/usermgr.db
ccnet_user_sql=${INSTALLPATH}/sql/sqlite/user.sql
if ! sqlite3 ${ccnet_user_db} ".read ${ccnet_user_sql}" 2>/dev/null 1>&2; then
    echo "Failed to sync ccnet user database."
    err_and_quit;
fi

seafile_db=${TOPDIR}/seafile-data/seafile.db
seafile_sql=${INSTALLPATH}/sql/sqlite/seafile.sql
if ! sqlite3 ${seafile_db} ".read ${seafile_sql}" 2>/dev/null 1>&2; then
    echo "Failed to sync seafile database."
    err_and_quit;
fi

seahub_db=${TOPDIR}/seahub.db
seahub_sqls=${INSTALLPATH}/seahub/sql/sqlite3.sql
if ! sqlite3 ${seahub_db} ".read ${seahub_sqls}" 2>/dev/null 1>&2; then
    echo "Failed to sync seahub database."
    err_and_quit;
fi
echo
echo "Done."

# prepare avatar folder

media_dir=${INSTALLPATH}/seahub/media
orig_avatar_dir=${INSTALLPATH}/seahub/media/avatars
dest_avatar_dir=${TOPDIR}/seahub-data/avatars

if [[ ! -d ${dest_avatar_dir} ]]; then
    mkdir -p "${TOPDIR}/seahub-data"
    mv "${orig_avatar_dir}" "${dest_avatar_dir}"
    ln -s ../../../seahub-data/avatars ${media_dir}
fi

# Make a seafile-server symlink, like this:
# /data/haiwen/
#            -- seafile-server-2.0.4
#            -- seafile-server-latest # symlink to 2.0.4
seafile_server_symlink=${TOPDIR}/seafile-server-latest
echo
echo -n "creating seafile-server-latest symbolic link ... "
if ! ln -s $(basename ${INSTALLPATH}) ${seafile_server_symlink}; then
    echo
    echo
    echo "Failed to create symbolic link ${seafile_server_symlink}"
    err_and_quit;
fi
echo "done"
echo

chmod 0600 "$dest_settings_py"
chmod 0700 "$default_ccnet_conf_dir"
chmod 0700 "$default_seafile_data_dir"
chmod 0700 "$default_conf_dir"

if [[ -d ${INSTALLPATH}/pro ]]; then
    pro_py=${INSTALLPATH}/pro/pro.py
    $PYTHON ${pro_py} setup
fi

# -------------------------------------------
# copy user manuals to library template
# -------------------------------------------
copy_user_manuals;

# -------------------------------------------
# final message
# -------------------------------------------

sleep 1

echo
echo "-----------------------------------------------------------------"
echo "Your seafile server configuration has been completed successfully." 
echo "-----------------------------------------------------------------"
echo 
echo "run seafile server:     ./seafile.sh { start | stop | restart }"
echo "run seahub  server:     ./seahub.sh  { start <port> | stop | restart <port> }"
echo
echo "-----------------------------------------------------------------"
echo "If the server is behind a firewall, remember to open these tcp ports:"
echo "-----------------------------------------------------------------"
echo
echo "port of seafile fileserver:   ${fileserver_port}"
echo "port of seahub:               8000"
echo
echo -e "When problems occur, refer to\n"
echo -e "      ${server_manual_http}\n"
echo "for more information."
echo
