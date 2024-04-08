import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const initFavicon = (fileName) => {
  const fileIcon = Utils.getFileIconUrl(fileName, 192);
  document.getElementById('favicon').href = fileIcon;
};

const getFileInfo = async (repoID, filePath) => {
  const fileInfoRes = await seafileAPI.getFileInfo(repoID, filePath);
  const { mtime, size, starred, permission, last_modifier_name: lastModifier, id } = fileInfoRes.data;
  return { mtime, size, starred, permission, lastModifier, id };
};

const getFileDownloadUrl = async (repoID, filePath) => {
  const fileDownloadUrlRes = await seafileAPI.getFileDownloadLink(repoID, filePath);
  const downloadUrl = fileDownloadUrlRes.data;
  return downloadUrl;
};

const setPermission = async (permission, repoID) => {
  let hasPermission = permission === 'rw' || permission === 'cloud-edit';
  // get custom permission
  if (permission.startsWith('custom-')) {
    const permissionID = permission.split('-')[1];
    const customPermissionRes = await seafileAPI.getCustomPermission(repoID, permissionID);
    const customPermission = customPermissionRes.data.permission;
    const { modify: canModify } = customPermission.permission;
    hasPermission = canModify ? true : hasPermission;
  }
  return hasPermission;
};

const setFileContent = async (downloadUrl) => {
  const fileContentRes = await seafileAPI.getFileContent(downloadUrl);
  const markdownContent = fileContentRes.data;
  return markdownContent;
};

export const getPlainOptions = async ({ fileName, filePath, repoID }) => {
  initFavicon(fileName);
  const fileInfo = await getFileInfo(repoID, filePath);
  const downloadUrl = await getFileDownloadUrl(repoID, filePath);
  const markdownContent = await setFileContent(downloadUrl);
  const hasPermission = await setPermission(fileInfo.permission, repoID);

  return { markdownContent, hasPermission, fileInfo };
};
