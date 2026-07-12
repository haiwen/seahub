import TextTranslation from '@/utils/text-translation';
import { username, enableAIChat, enableSeafileAI } from '@/utils/constants';
import { Utils } from '@/utils/utils';

const isDivider = (item) => item === 'Divider';

const canUseAIChat = (repoInfo) => {
  return Boolean(enableSeafileAI && enableAIChat && repoInfo && !repoInfo.is_virtual);
};

const canChatWithDirents = (repoInfo, dirents) => {
  return canUseAIChat(repoInfo) && Array.isArray(dirents) && dirents.length > 0 && dirents.every((dirent) => dirent?.type === 'file');
};

const trimTrailingDividers = (menuList) => {
  const nextMenuList = menuList.slice();
  while (nextMenuList.length > 0 && isDivider(nextMenuList[nextMenuList.length - 1])) {
    nextMenuList.pop();
  }
  return nextMenuList;
};

const findFreezeInsertIndex = (menuList) => {
  return menuList.findIndex((item) => item?.key === TextTranslation.FREEZE_DOCUMENT.key || item?.key === TextTranslation.UNFREEZE_DOCUMENT.key);
};

const findOpenMethodInsertIndex = (menuList) => {
  return menuList.findIndex((item) => {
    const key = item?.key;
    return key === TextTranslation.OPEN_WITH.key ||
      key === TextTranslation.OPEN_WITH_DEFAULT.key ||
      key === TextTranslation.OPEN_VIA_CLIENT.key ||
      key === TextTranslation.OPEN_WITH_ONLYOFFICE.key;
  });
};

const addStandaloneChatWithAIGroup = (menuList, chatOption) => {
  const nextMenuList = trimTrailingDividers(menuList);
  const openMethodIndex = findOpenMethodInsertIndex(nextMenuList);

  if (openMethodIndex > -1) {
    const insertItems = [];
    if (openMethodIndex > 0 && !isDivider(nextMenuList[openMethodIndex - 1])) {
      insertItems.push('Divider');
    }
    insertItems.push(chatOption, 'Divider');
    nextMenuList.splice(openMethodIndex, 0, ...insertItems);
    return nextMenuList;
  }

  if (nextMenuList.length > 0 && !isDivider(nextMenuList[nextMenuList.length - 1])) {
    nextMenuList.push('Divider');
  }
  nextMenuList.push(chatOption, 'Divider');
  return nextMenuList;
};

export const addChatWithAIOption = (menuList, repoInfo, dirents) => {
  if (!canChatWithDirents(repoInfo, dirents)) {
    return menuList;
  }

  const nextMenuList = menuList.slice();
  const chatOption = TextTranslation.CHAT_WITH_AI;
  if (nextMenuList.some((item) => item?.key === chatOption.key)) {
    return nextMenuList;
  }

  const freezeIndex = findFreezeInsertIndex(nextMenuList);
  if (freezeIndex > -1) {
    nextMenuList.splice(freezeIndex, 0, chatOption);
    return trimTrailingDividers(nextMenuList);
  }

  return trimTrailingDividers(addStandaloneChatWithAIGroup(nextMenuList, chatOption));
};

export const buildSelectedDirentsChatMenuList = (menuList, repoInfo, dirents) => {
  const nextMenuList = addChatWithAIOption(menuList, repoInfo, dirents);
  return trimTrailingDividers(nextMenuList);
};

export const canShowChatWithAI = canChatWithDirents;

export const getDirentItemMenuList = (repoInfo, dirent, isContextmenu = true) => {
  const isRepoOwner = repoInfo.owner_email === username;
  const menuList = Utils.getDirentOperationList(isRepoOwner, repoInfo, dirent, isContextmenu);
  return addChatWithAIOption(menuList, repoInfo, [dirent]);
};

export const getBatchMenuList = (repoInfo, selectedDirents, getItemMenuList) => {
  const { isCustomPermission, customPermission } = Utils.getUserPermission(repoInfo.user_perm);

  if (selectedDirents.length <= 1) {
    return getItemMenuList(selectedDirents[0]);
  }

  let batchOptions = [];
  if (isCustomPermission) {
    const { modify: canModify, copy: canCopy, download: canDownload, delete: canDelete } = customPermission.permission;
    canDownload && batchOptions.push(TextTranslation.DOWNLOAD);
    canDelete && batchOptions.push(TextTranslation.DELETE);
    canModify && batchOptions.push(TextTranslation.MOVE);
    canCopy && batchOptions.push(TextTranslation.COPY);
  } else {
    batchOptions = [
      TextTranslation.DOWNLOAD,
      TextTranslation.DELETE,
      TextTranslation.MOVE,
      TextTranslation.COPY,
    ];
  }
  return addChatWithAIOption(batchOptions, repoInfo, selectedDirents);
};

export const getPermissions = (repoInfo) => {
  return {
    isRepoOwner: repoInfo.owner_email === username,
    userPerm: repoInfo.user_perm,
    customPerm: Utils.getUserPermission(repoInfo.user_perm),
  };
};

export const getCreateMenuList = ({
  enableSeadoc = false,
  enableWhiteboard = false,
  isRepoEncrypted = false
}) => {
  const {
    NEW_FOLDER, NEW_FILE,
    NEW_MARKDOWN_FILE,
    NEW_EXCEL_FILE,
    NEW_POWERPOINT_FILE,
    NEW_WORD_FILE,
    NEW_SEADOC_FILE,
    NEW_TLDRAW_FILE,
    NEW_EXCALIDRAW_FILE
  } = TextTranslation;

  const createMenuList = [NEW_FOLDER, NEW_FILE, 'Divider'];

  if (enableSeadoc && !isRepoEncrypted) {
    createMenuList.push(NEW_SEADOC_FILE, NEW_EXCALIDRAW_FILE);
  }

  createMenuList.push(
    NEW_MARKDOWN_FILE,
    NEW_EXCEL_FILE,
    NEW_POWERPOINT_FILE,
    NEW_WORD_FILE,
  );

  if (enableWhiteboard) {
    createMenuList.push(NEW_TLDRAW_FILE);
  }

  return createMenuList;
};
