import { Utils } from '../../../utils/utils';

export const getDirentPath = (dirent, path) => {
  if (Utils.isMarkdownFile(path)) return path; // column mode: view file
  if (dirent.type === 'dir') return path;
  return Utils.joinPath(path, dirent.name);
};

export const getFileParent = (dirent, path) => {
  const direntPath = getDirentPath(dirent, path);
  if (direntPath === '/') return '/';
  const index = direntPath.lastIndexOf('/');
  const positionPath = direntPath.slice(0, index);
  return positionPath || '/';
};
