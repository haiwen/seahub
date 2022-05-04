#!/usr/bin/env python3

import sys
import os
import logging
from seafobj.objstore_factory import objstore_factory

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

def main(argv):
    repo_id = argv[1]
    orig_storage_id = argv[2]

    dtypes = ['commits', 'fs', 'blocks']
    for dtype in dtypes:
        if 'OBJECT_LIST_FILE_PATH' in os.environ:
            object_list_file_path = '.'.join(['_'.join([os.environ['OBJECT_LIST_FILE_PATH'], repo_id]), dtype])
        else:
            logging.warning('OBJECT_LIST_FILE_PATH environment does not exist.')
            sys.exit()

        obj_stores = objstore_factory.get_obj_stores(dtype)
        #If these storage ids passed in do not exist in conf, stop migrate this repo.
        if orig_storage_id not in obj_stores:
            logging.warning('Storage id passed in does not exist in configuration.\n')
            sys.exit()

        orig_store = obj_stores[orig_storage_id]

        with open(object_list_file_path, 'r') as f:
            for line in f:
                obj = line.rstrip('\n').split('/', 1)
                try:
                    orig_store.remove_obj(obj[0], obj[1])
                except Exception as e:
                    logging.warning('Failed to remove object %s from repo %s:%s' % (obj[1], obj[0], e))

    logging.info('The process of remove repo [%s] is over.\n', repo_id)

if __name__ == '__main__':
    main(sys.argv)
