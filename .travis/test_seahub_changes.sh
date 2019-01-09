#!/bin/bash

test_fn()
{
    FN=$1
    shift;
    echo "Testing $FN..."

    # frontend* -> 0
    patt="frontend*"
    [[ $FN == $patt ]] && return 0

    # media* -> 0
    patt="media*"
    [[ $FN == $patt ]] && return 0

    # static* -> 0
    patt="static*"
    [[ $FN == $patt ]] && return 0

    # locale* -> 0
    patt="locale*"
    [[ $FN == $patt ]] && return 0
    
    return 1
}

FILES=`git diff --name-only HEAD~`
for i in $FILES
do
    test_fn $i
    retval=$?

    if [ "$retval" == 1 ]; then
        echo "File changes need to trigger tests."
        exit 0
    fi

done

echo "Static/media file changes should not trigger tests."
exit 1
