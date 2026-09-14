import { useCallback } from 'react';
import * as ContextMenuUtils from '@/components/dirent-operation-menu/contextMenuUtils';

export const useDirentContextMenu = ({ repoInfo, userPerm }) => {
  const getItemMenuList = useCallback((dirent, isContextmenu = true) => {
    return ContextMenuUtils.getDirentItemMenuList(repoInfo, dirent, isContextmenu);
  }, [repoInfo]);

  const getBatchMenuList = useCallback((selectedDirents) => {
    return ContextMenuUtils.getBatchMenuList(repoInfo, userPerm, selectedDirents, getItemMenuList);
  }, [repoInfo, userPerm, getItemMenuList]);

  return { getItemMenuList, getBatchMenuList };
};
