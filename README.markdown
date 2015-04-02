[![Build Status](https://secure.travis-ci.org/haiwen/seahub.svg?branch=master)](http://travis-ci.org/haiwen/seahub)

Introduction
==========

Seahub is the web frontend for Seafile.

Preparation
==========

* Build and deploy Seafile server from source. See <https://github.com/haiwen/seafile/wiki/Build-and-deploy-seafile-server-from-source>

Getting it
==========

You can grab souce code from GitHub.

    $ git clone git://github.com/haiwen/seahub.git

Install python libraries by pip:

    pip install -r requirements.txt


Configuration
==========

Modify `CCNET_CONF_DIR`, `SEAFILE_CONF_DIR` and `PYTHONPATH` in `setenv.sh.template` to fit your path.

`CCNET_CONF_DIR` is the directory contains `ccnet.conf`.

`SEAFILE_CONF_DIR` is the directory contains `seafile.conf`.

Run and Verify
==========

Run as:

    ./run-seahub.sh.template

Then open your browser, and input `http://localhost:8000/`, there should be a Login page. You can create admin account using `seahub-admin.py` script under `tools/` directory.

Internationalization (I18n)
==========

Please refer to https://github.com/haiwen/seafile/wiki/Seahub-Translation

