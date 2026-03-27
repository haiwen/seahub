import os
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

install_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
top_dir = os.path.dirname(install_path)
central_config_dir = os.path.join(top_dir, 'conf')

def load_env_file():
    file_path = os.path.join(central_config_dir, ".env")
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ[key] = value

load_env_file()

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
            repo_ids = [repo[0] for repo in repo_commits if repo[2] != 'wiki']
            virtual_repos = repo_data.get_virtual_repo_in_repos(repo_ids)
            virtual_repo_set = {repo[0] for repo in virtual_repos}
            for repo_id, commit_id, repo_type in repo_commits:
                if repo_id in virtual_repo_set or repo_type == 'wiki':
                    continue
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

