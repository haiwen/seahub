import logging
import argparse

from seafes.config import seafes_config
from seafes.repo_data import repo_data
from seafes.mq import get_mq

seafes_config.load_index_master_conf()
mq = get_mq(seafes_config.subscribe_mq,
            seafes_config.subscribe_server,
            seafes_config.subscribe_port,
            seafes_config.subscribe_password)

def put_to_redis(repo_id, cmt_id):
    msg = "index_recover\t%s\t%s" % (repo_id, cmt_id)
    mq.lpush('index_task', msg)

def show_all_task():
    logging.info("index task count: %s" % mq.llen('index_task'))

def restore_all_repo():
    start, count = 0, 1000
    while True:
        try:
            repo_commits = repo_data.get_repo_id_commit_id(start, count)
        except Exception as e:
            logging.error("Error: %s" % e)
            return
        else:
            if len(repo_commits) == 0:
                break
            for repo_id, commit_id in repo_commits:
                put_to_redis(repo_id, commit_id)
            start += 1000

def main():
    parser = argparse.ArgumentParser(description='main program')
    parser.add_argument('--mode')
    parser_args = parser.parse_args()

    if parser_args.mode == 'resotre_all_repo':
        restore_all_repo()
    elif parser_args.mode == 'show_all_task':
        show_all_task()


if __name__ == '__main__':
    main()

