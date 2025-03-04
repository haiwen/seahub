import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

// API 获取文档信息
const getFileInfo = async (repoID, filePath) => {
  const fileInfoRes = await seafileAPI.getFileInfo(repoID, filePath);
  const { mtime, size, starred, permission, last_modifier_name: lastModifier, id } = fileInfoRes.data;
  return { mtime, size, starred, permission, lastModifier, id };
};

// API 获取下载链接
const getFileDownloadUrl = async (repoID, filePath) => {
  const fileDownloadUrlRes = await seafileAPI.getFileDownloadLink(repoID, filePath);
  const downloadUrl = fileDownloadUrlRes.data;
  return downloadUrl;
};

// API 获取权限
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

// API 获取文档内容
const setFileContent = async (downloadUrl) => {
  const fileContentRes = await seafileAPI.getFileContent(downloadUrl);
  const markdownContent = fileContentRes.data;
  return markdownContent;
};

// 获取全部信息入口
export const getPlainOptions = async ({ fileName, filePath, repoID }) => {
  const fileIcon = Utils.getFileIconUrl(fileName);
  document.getElementById('favicon').href = fileIcon;
  const fileInfo = await getFileInfo(repoID, filePath);
  const downloadUrl = await getFileDownloadUrl(repoID, filePath);
  const markdownContent = await setFileContent(downloadUrl);
  const hasPermission = await setPermission(fileInfo.permission, repoID);

  // 早期是多个 await 串行执行，可能消耗较多时间；可以改成多个 API 同时执行，减少网络请求的时间
  // const [fileInfo, downloadUrl] = await Promise.all([
  //   getFileInfo(repoID, filePath),
  //   getFileDownloadUrl(repoID, filePath),
  // ]);
  // const [markdownContent, hasPermission] = await Promise.all([
  //   setFileContent(downloadUrl),
  //   setPermission(fileInfo.permission, repoID),
  // ]);

  return { markdownContent, hasPermission, fileInfo };
};
