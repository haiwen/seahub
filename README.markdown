[![Build Status](https://secure.travis-ci.org/haiwen/seahub.svg?branch=master)](http://travis-ci.org/haiwen/seahub)

Introduction
==========

Seahub is the web frontend for Seafile.

Preparation
==========

* Build and deploy Seafile server from source. See <https://manual.seafile.com/latest/>

Getting it
==========

You can grab souce code from GitHub.

    $ git clone git://github.com/haiwen/seahub.git

Set up a virtualenv to install dependencies locally:

    $ virtualenv .virtualenv
    $ . .virtualenv/bin/activate

Install python libraries by pip:

    $ pip install -r requirements.txt


Configuration
==========

Modify `CCNET_CONF_DIR`, `SEAFILE_CENTRAL_CONF_DIR`, `SEAFILE_CONF_DIR` and `PYTHONPATH` in `setenv.sh.template` to fit your path.

`CCNET_CONF_DIR` is the directory, that contains the ccnet socket (and formerly ccnet.conf).

Since 5.0 `SEAFILE_CENTRAL_CONF_DIR` contains most config files.

`SEAFILE_CONF_DIR` is the seafile-data directory (and formerly contained seafile.conf).

Run and Verify
==========

Run as:

    $ . .virtualenv/bin/activate
    $ ./run-seahub.sh.template

Then open your browser, and input `http://localhost:8000/`, there should be a Login page. You can create admin account using `seahub-admin.py` script under `tools/` directory.


Internationalization (I18n)
==========

Please submit translations via Transifex:

Steps:

1. Visit the webpage of Transifex ([https://explore.transifex.com/haiwen/seahub/](https://explore.transifex.com/haiwen/seahub/)).

2. Click the "Join this project" button in the bottom right corner.

3. Use an email or GitHub account(recommended) to create an account.

4. Select a language and click 'Join project' to join the language translation.

5. After accepted by the project maintainer, then you can upload your file or translate online.
