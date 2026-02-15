import { useCallback, useMemo } from 'react';
import * as ContextMenuUtils from '../utils/contextMenuUtils';

export const useDirentContextMenu = ({ repoInfo }) => {
  const getItemMenuList = useCallback((dirent, isContextmenu = true) => {
    return ContextMenuUtils.getDirentItemMenuList(repoInfo, dirent, isContextmenu);
  }, [repoInfo]);

  const getBatchMenuList = useCallback((selectedDirents) => {
    return ContextMenuUtils.getBatchMenuList(repoInfo, selectedDirents, getItemMenuList);
  }, [repoInfo, getItemMenuList]);

  const permissions = useMemo(() => {
    return ContextMenuUtils.getPermissions(repoInfo);
  }, [repoInfo]);

  return { getItemMenuList, getBatchMenuList, permissions };
};
