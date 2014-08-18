#!/bin/bash
current_dir=$(pwd)
if [ ! -d "${current_dir}/tests/basic" ] ; then
    current_dir="${current_dir}/.."
fi
if [ ! -d "${current_dir}/tests/basic" ] ; then
    echo "Not found test data" && exit -1
fi

export CCNET_CONF_DIR="${current_dir}/tests/basic"
export SEAFILE_CONF_DIR="${current_dir}/tests/basic/seafile-data"
export PYTHONPATH="/usr/local/lib/python2.7/site-packages:/usr/lib/python2.7/site-packages:${current_dir}/thirdpart:${PYTHONPATH}"
export PATH="${current_dir}/deps/casperjs/bin:${PATH}"
cd $current_dir
function init() {
    seaf-server-init -d "${current_dir}/tests/basic/seafile-data" || exit -1
    ./manage.py syncdb

    if [ ! -d "${current_dir}/deps/casperjs" ] ; then
        curl -L -o /tmp/casperjs.tar.gz https://github.com/n1k0/casperjs/archive/1.1-beta3.tar.gz
        tar -C /tmp -xzf /tmp/casperjs.tar.gz
        mv /tmp/casperjs-1.1-beta3 ${current_dir}/deps/casperjs
    fi
}
function seahub() {
    ccnet-server -c "${current_dir}/tests/basic" &
    seaf-server -c "${current_dir}/tests/basic" \
      -d "${current_dir}/tests/basic/seafile-data" &
    fileserver -c "${current_dir}/tests/basic" \
      -d "${current_dir}/tests/basic/seafile-data" &
    sleep 3
    python -c "import ccnet; pool = ccnet.ClientPool('${CCNET_CONF_DIR}'); ccnet_threaded_rpc = ccnet.CcnetThreadedRpcClient(pool, req_pool=True); ccnet_threaded_rpc.add_emailuser('test@test.com', 'testtest', 1, 1);"

    ./manage.py runserver &
}
function run() {
    pushd tests
    casperjs test . || exit -1
    popd
}
function stop_seahub() {
    pkill python
    pkill fileserver
    pkill ccnet
}

case $1 in
    "init")
        init
        ;;
    "run")
        seahub
        run
        stop_seahub
        ;;
    *)
        run
        ;;
esac
