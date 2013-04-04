# -*- coding: utf-8 -*-
import seaserv
from seahub.utils import EMPTY_SHA1

def list_dir_by_path(cmmt, path):
    if cmmt.root_id == EMPTY_SHA1:
        return []
    else:
        return seaserv.list_dir_by_path(cmmt.id, path)
    
