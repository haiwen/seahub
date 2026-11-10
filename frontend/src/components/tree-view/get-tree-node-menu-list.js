import TextTranslation from '../../utils/text-translation';
import { Utils } from '../../utils/utils';

const getTreeNodeMenuList = (node, userPerm, currentRepoInfo) => {
  if (node.object.write_protected) return [];
  const { NEW_FOLDER, NEW_FILE, COPY, MOVE, RENAME, DELETE, OPEN_VIA_CLIENT } = TextTranslation;
  let menuList = node.object.type === 'dir'
    ? [NEW_FOLDER, NEW_FILE, COPY, MOVE, RENAME, DELETE]
    : [RENAME, DELETE, COPY, MOVE, OPEN_VIA_CLIENT];

  const nodePermission = node.object.permission || userPerm;
  const { isCustomPermission, customPermission } = Utils.getUserPermission(nodePermission);

  if (!isCustomPermission) {
    if (nodePermission === 'r') {
      return currentRepoInfo && currentRepoInfo.encrypted ? [] : [COPY];
    }
    if (nodePermission === 'preview') {
      return [];
    }
    return menuList;
  }

  menuList = [];
  const { create: canCreate, modify: canModify, delete: canDelete, copy: canCopy } = customPermission.permission;

  if (node.object.type === 'dir' && canCreate) {
    menuList.push(NEW_FOLDER, NEW_FILE);
  }
  if (canCopy) menuList.push(COPY);
  if (canModify) menuList.push(MOVE, RENAME);
  if (canDelete) menuList.push(DELETE);
  if (node.object.type !== 'dir') menuList.push(OPEN_VIA_CLIENT);

  return menuList;
};

export default getTreeNodeMenuList;
