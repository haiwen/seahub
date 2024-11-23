import { getFileNameFromRecord, getParentDirFromRecord } from './cell';
import { checkIsDir } from './row';
import { Utils } from '../../utils/utils';
import { siteRoot } from '../../utils/constants';

const FILE_TYPE = {
  FOLDER: 'folder',
  MARKDOWN: 'markdown',
  SDOC: 'sdoc',
  IMAGE: 'image',
};

const _getFileType = (fileName, isDir) => {
  if (isDir) return FILE_TYPE.FOLDER;
  if (!fileName) return '';
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  const suffix = fileName.slice(index).toLowerCase();
  if (suffix.indexOf(' ') > -1) return '';
  if (Utils.imageCheck(fileName)) return FILE_TYPE.IMAGE;
  if (Utils.isMarkdownFile(fileName)) return FILE_TYPE.MARKDOWN;
  if (Utils.isSdocFile(fileName)) return FILE_TYPE.SDOC;
  return '';
};

const _getParentDir = (record) => {
  const parentDir = getParentDirFromRecord(record);
  if (parentDir === '/') {
    return '';
  }
  return parentDir;
};

const _generateUrl = (repoID, fileName, parentDir) => {
  const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
  return `${siteRoot}lib/${repoID}/file${path}`;
};

const _openUrl = (url) => {
  const isWeChat = Utils.isWeChat();
  if (isWeChat) {
    location.href = url;
    return;
  }
  window.open(url);
};

const _openMarkdown = (repoID, fileName, parentDir) => {
  const url = _generateUrl(repoID, fileName, parentDir);
  _openUrl(url);
};

const _openByNewWindow = (repoID, fileName, parentDir, fileType) => {
  if (!fileType) {
    const url = _generateUrl(repoID, fileName, parentDir);
    _openUrl(url);
    return;
  }
  let pathname = window.location.pathname;
  if (pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  _openUrl(window.location.origin + pathname + Utils.encodePath(Utils.joinPath(parentDir, fileName)));
};

const _openSdoc = (repoID, fileName, parentDir) => {
  const url = _generateUrl(repoID, fileName, parentDir);
  _openUrl(url);
};

const _openOthers = (repoID, fileName, parentDir, fileType) => {
  _openByNewWindow(repoID, fileName, parentDir, fileType);
};

export const openFile = (repoID, record, _openImage = () => {}) => {
  if (!record) return;
  const fileName = getFileNameFromRecord(record);
  const isDir = checkIsDir(record);
  const parentDir = _getParentDir(record);
  const fileType = _getFileType(fileName, isDir);

  switch (fileType) {
    case FILE_TYPE.MARKDOWN: {
      _openMarkdown(repoID, fileName, parentDir);
      break;
    }
    case FILE_TYPE.SDOC: {
      _openSdoc(repoID, fileName, parentDir);
      break;
    }
    case FILE_TYPE.IMAGE: {
      _openImage(record);
      break;
    }
    default: {
      _openOthers(repoID, fileName, parentDir, fileType);
      break;
    }
  }
};

