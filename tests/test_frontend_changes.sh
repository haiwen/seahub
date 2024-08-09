#!/bin/bash

check_path_fn()
{
    FN=$1
    shift
    patt="frontend*"
    [[ $FN == $patt ]] && return 1
    return 0
}

FILES=`git diff --name-only HEAD~`

for i in $FILES
do
    check_path_fn $i
    retval=$?

    if [ "$retval" == 1 ]; then
        echo "File changes need to trigger tests."
        exit 0
    fi

done

exit 1
