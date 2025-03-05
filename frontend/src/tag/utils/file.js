import { enableSeadoc, fileAuditEnabled, isPro } from '../../utils/constants';
import TextTranslation from '../../utils/text-translation';
import { Utils } from '../../utils/utils';
import { TAG_FILE_KEY } from '../constants/file';

export const getFileById = (tagFiles, fileId) => {
  return fileId ? tagFiles.rows.find(file => file._id === fileId) : '';
};

export const getFileName = (file) => {
  return file ? file[TAG_FILE_KEY.NAME] : '';
};

export const getFileParentDir = (file) => {
  return file ? file[TAG_FILE_KEY.PARENT_DIR] : '';
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
