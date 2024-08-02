import { Utils } from '../../../utils/utils';

export const getDirentPath = (dirent, path) => {
  if (Utils.isMarkdownFile(path)) return path; // column mode: view file
  return Utils.joinPath(path, dirent.name);
};

export const getDirentPosition = (repoInfo, dirent, path) => {
  const direntPath = getDirentPath(dirent, path);
  const position = repoInfo.repo_name;
  if (direntPath === '/') return position;
  const index = direntPath.lastIndexOf('/');
  return position + direntPath.slice(0, index);
};
