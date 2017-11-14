#!/bin/bash

function usage () {
    echo "usage: $0 <options>"
    echo
    echo "  update <app>            update po of this app"
    echo "  update seahub           update po of seahub"
    echo "  update-all              update po of all apps"
    echo "  compile <app>           compile po file of this app"
    echo "  compile seahub          compile po file of seahub"
    echo "  compile-all             compile po files of all apps"
    echo
}

apps="seahub/trusted_ip"
function is_valid_app() {
    if [[ $1 == "seahub" ]]; then
        return 0;
    fi

    for app in ${apps}; do
        if [[ $1 == $app ]]; then
            return 0;
        fi
    done

    return 1
}

# On some systems django-admin.py is only django-admin
if which django-admin.py 2>/dev/null 1>&2; then
    django_admin=django-admin.py
elif which django-admin 2>/dev/null 1>&2; then
    django_admin=django-admin
else
    echo "ERROR: django-admin script not found"
    exit 1
fi

# check args
if [[ $# == 0 ]]; then
    usage;
    exit 1;
fi

if [[ $1 == "-h" || $1 == "--help" || $1 == "help" ]]; then
    usage;
    exit 0;
fi

if [[ $1 != "update" && $1 != "update-all" && $1 != "compile" && $1 != "compile-all" ]]; then
    usage;
    exit 1;
fi

if [[ $1 == "update" || $1 == "compile" ]]; then
    if [[ $# != 2 ]]; then
        usage;
        exit 1;
    fi

    if ! is_valid_app $2; then
        echo "\"$2\" is not a valid app name";
        exit 1
    fi
fi

case $1 in
    update)
        printf "\033[1;32m[i18n]\033[m >>>>>  update po of $2 <<<<<\n"
        if [[ $2 == "seahub" ]]; then
            ${django_admin} makemessages -l zh_CN -e py,html \
                -i "thirdpart*" -i "api*" -i "avatar*" -i "base*" \
                -i "contacts*" -i "group*" -i "notifications*" -i "organizations*" \
                -i "profile*" -i "share*" -i "media*"
        else
            pushd $2 2>/dev/null 1>&2
            ${django_admin} makemessages -l zh_CN -e py,html
            popd 2>/dev/null 1>&2
        fi
        ;;
    update-all)
        printf "\033[1;32m[i18n]\033[m >>>>>  update po of seahub <<<<<\n"
        ${django_admin} makemessages -l zh_CN -e py,html \
            -i "thirdpart*" -i "api*" -i "avatar*" -i "base*" \
            -i "contacts*" -i "group*" -i "notifications*" -i "organizations*" \
            -i "profile*" -i "share*" -i "media*"
        for app in ${apps}; do
            printf "\033[1;32m[i18n]\033[m >>>>>  update po of ${app} <<<<<\n"
            pushd ${app} 2>/dev/null 1>&2
            ${django_admin} makemessages -l zh_CN -e py,html
            popd 2>/dev/null 1>&2
        done
        ;;
    compile)
        printf "\033[1;32m[i18n]\033[m >>>>>  compile po of $2 <<<<<\n"
        if [[ $2 == "seahub" ]]; then
            ${django_admin} compilemessages
        else
            pushd $2
            ${django_admin} compilemessages
            popd
        fi
        ;;
    compile-all)
        printf "\033[1;32m[i18n]\033[m >>>>>  compile po of seahub <<<<<\n"
        ${django_admin} compilemessages
        for app in ${apps}; do
            printf "\033[1;32m[i18n]\033[m >>>>>  compile po of ${app} <<<<<\n"
            pushd ${app} 2>/dev/null 1>&2
            ${django_admin} compilemessages
            popd
        done
        ;;
esac

echo Done
echo
