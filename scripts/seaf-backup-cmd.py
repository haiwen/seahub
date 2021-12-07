#!/usr/bin/env python3
#coding: utf-8

import json
import argparse

from seaserv import seafile_api
from pysearpc import SearpcError

def show_backup_status(args):
    ret_str = seafile_api.get_backup_status()
    ret_dict = json.loads(ret_str)
    print('Total number of libraries: %s' % ret_dict['n_total'])
    print('Number of synchronized libraries: %s' % ret_dict['n_synced'])
    print('Number of libraries waiting for sync: %s' % ret_dict['n_waiting'])
    print('Number of libraries syncing: %s' % ret_dict['n_syncing'])
    print('Number of libraries failed to sync: %s\n' % ret_dict['n_error'])
    print('List of syncing libraries:')
    for repo in ret_dict['syncing_repos']:
        print(repo)
    print('')
    print('List of libraries failed to sync:')
    for repo in ret_dict['error_repos']:
        print(repo)

def sync_repo(args):
    if len(args.repo_id) != 36:
        print('Invalid repo id %s.' % args.repo_id)
        return

    try:
        seafile_api.sync_repo_manually(args.repo_id, 1 if args.force else 0)
    except SearpcError as e:
        print('Failed to sync repo %s: %s.' % (args.repo_id, e))
    else:
        print('Sync repo %s successfully.' % args.repo_id)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subparser = parser.add_subparsers(title='subcommands', description='')
    status_parser = subparser.add_parser('status', help='get backup status')
    status_parser.set_defaults(func=show_backup_status)

    sync_parser = subparser.add_parser('sync', help='sync repo')
    sync_parser.add_argument('-f', '--force', help='force sync repo', action='store_true')
    sync_parser.add_argument('repo_id', help='repo id to sync')
    sync_parser.set_defaults(func=sync_repo)

    args = parser.parse_args()
    args.func(args)
