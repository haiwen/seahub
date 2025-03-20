import { getFileMTimeFromRecord, getFileSizedFromRecord } from '../../metadata/utils/cell';
import { compareString } from '../../metadata/utils/sort';
import { enableSeadoc, fileAuditEnabled, isPro } from '../../utils/constants';
import TextTranslation from '../../utils/text-translation';
import { Utils } from '../../utils/utils';
import { TAG_FILE_KEY } from '../constants/file';
import { TAG_FILES_SORT_KEY } from '../constants/sort';
import { getSortBy, getSortOrder } from './sort';

export const getFileById = (tagFiles, fileId) => {
  return fileId ? tagFiles.rows.find(file => file._id === fileId) : '';
};

export const getFileName = (file) => {
  return file ? file[TAG_FILE_KEY.NAME] : '';
};

export const getFileParentDir = (file) => {
  return file ? file[TAG_FILE_KEY.PARENT_DIR] : '';
};

export const getFileMTime = (file) => {
  return file ? file[TAG_FILE_KEY.FILE_MTIME] : '';
};

export const getFileSize = (file) => {
  return file ? file[TAG_FILE_KEY.SIZE] : '';
};

export const getTagFileOperationList = (fileName, repo, canModify) => {
  const {
    SHARE, DOWNLOAD, DELETE, RENAME, MOVE, COPY, HISTORY, ACCESS_LOG, OPEN_VIA_CLIENT, CONVERT_AND_EXPORT, CONVERT_TO_MARKDOWN, CONVERT_TO_DOCX, EXPORT_DOCX, CONVERT_TO_SDOC, EXPORT_SDOC
  } = TextTranslation;
  let menuList = [DOWNLOAD, SHARE];
  if (canModify) {
    menuList.push(DELETE, 'Divider', RENAME, MOVE, COPY);
    if (enableSeadoc && !repo.encrypted) {
      menuList.push('Divider');
      if (fileName.endsWith('.md') || fileName.endsWith('.docx')) {
        menuList.push(CONVERT_TO_SDOC);
      }
      if (fileName.endsWith('.sdoc')) {
        if (Utils.isDesktop()) {
          let subOpList = [CONVERT_TO_MARKDOWN, CONVERT_TO_DOCX, EXPORT_DOCX, EXPORT_SDOC];
          menuList.push({ ...CONVERT_AND_EXPORT, subOpList });
        } else {
          menuList.push(CONVERT_TO_MARKDOWN);
          menuList.push(CONVERT_TO_DOCX);
          menuList.push(EXPORT_DOCX);
          menuList.push(EXPORT_SDOC);
        }
      }
    }
    menuList.push('Divider', HISTORY);
    if (isPro && fileAuditEnabled) {
      menuList.push(ACCESS_LOG);
    }
    menuList.push('Divider', OPEN_VIA_CLIENT);
  }

  // if the last item of menuList is ‘Divider’, delete the last item
  if (menuList[menuList.length - 1] === 'Divider') {
    menuList.pop();
  }

  // Remove adjacent excess 'Divider'
  for (let i = 0; i < menuList.length; i++) {
    if (menuList[i] === 'Divider' && menuList[i + 1] === 'Divider') {
      menuList.splice(i, 1);
      i--;
    }
  }
  return menuList;
};

export const sortTagFiles = (files, sort) => {
  const sortBy = getSortBy(sort);
  const order = getSortOrder(sort);

  const compare = (a, b) => {
    let valueA = '';
    let valueB = '';
    switch (sortBy) {
      case TAG_FILES_SORT_KEY.NAME:
        valueA = getFileName(a);
        valueB = getFileName(b);
        break;
      case TAG_FILES_SORT_KEY.SIZE:
        valueA = getFileSize(a);
        valueB = getFileSize(b);
        break;
      case TAG_FILES_SORT_KEY.TIME:
        valueA = getFileMTime(a);
        valueB = getFileMTime(b);
        break;
      default:
        break;
    }

    const result =
      sortBy === TAG_FILES_SORT_KEY.SIZE
        ? valueA - valueB
        : compareString(valueA, valueB);

    return order === 'asc' ? result : -result;
  };

  return files.sort(compare);
};
