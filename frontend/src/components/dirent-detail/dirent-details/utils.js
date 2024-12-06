import { Utils } from '../../../utils/utils';

export const getDirentPath = (dirent, path) => {
  if (Utils.isMarkdownFile(path)) return path; // column mode: view file
  return Utils.joinPath(path, dirent?.name);
};

export const getFileParent = (dirent, path) => {
  const direntPath = getDirentPath(dirent, path);
  let position = '';
  if (direntPath !== '/') {
    const index = direntPath.lastIndexOf('/');
    const positionPath = direntPath.slice(0, index);
    position = position + positionPath;
  }
  return position;
};
