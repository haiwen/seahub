import { seafileAPI } from './seafile-api';
import { Utils } from './utils';
import { gettext, username } from './constants';
import URLDecorator from './url-decorator';
import toaster from '../components/toast';

// Generic error handling
export const handleError = (error) => {
  const errMessage = Utils.getErrorMsg(error);
  toaster.danger(errMessage);
};

// Core operation functions (pure functions, can be called directly by any component)
export const lockFile = async (repoID, path, dirent, updateState) => {
  const filePath = Utils.joinPath(path, dirent.name);
  try {
    await seafileAPI.lockfile(repoID, filePath);
    if (updateState) {
      updateState(dirent, {
        is_locked: true,
        locked_by_me: true,
        lock_owner_name: username.split('@')[0]
      });
    }
    return { success: true };
  } catch (error) {
    handleError(error);
    return { success: false, error };
  }
};

export const unlockFile = async (repoID, path, dirent, updateState) => {
  const filePath = Utils.joinPath(path, dirent.name);
  try {
    await seafileAPI.unlockfile(repoID, filePath);
    if (updateState) {
      const updates = {
        is_locked: false,
        locked_by_me: false,
        lock_owner_name: ''
      };
      updateState(dirent, updates);
    }
    return { success: true };
  } catch (error) {
    handleError(error);
    return { success: false, error };
  }
};

export const exportDocx = (repoID, path, dirent) => {
  const serviceUrl = window.app.config.serviceURL;
  const filePath = Utils.joinPath(path, dirent.name);
  const exportUrl = `${serviceUrl}/repo/sdoc_export_to_docx/${repoID}/?file_path=${encodeURIComponent(filePath)}`;
  window.location.href = exportUrl;
};

export const exportSdoc = (repoID, path, dirent) => {
  const serviceUrl = window.app.config.serviceURL;
  const filePath = Utils.joinPath(path, dirent.name);
  const exportUrl = `${serviceUrl}/lib/${repoID}/file/${encodeURIComponent(filePath)}?dl=1`;
  window.location.href = exportUrl;
};

export const toggleStar = async (repoID, path, dirent, updateState) => {
  const filePath = Utils.joinPath(path, dirent.name);
  try {
    const api = dirent.starred ? seafileAPI.unstarItem : seafileAPI.starItem;
    await api(repoID, filePath);
    if (updateState) {
      updateState(dirent, { starred: !dirent.starred });
    }
    const msg = gettext(dirent.starred ?
      'Successfully unstarred {name_placeholder}.' :
      'Successfully starred {name_placeholder}.'
    ).replace('{name_placeholder}', dirent.name);
    toaster.success(msg);
    return { success: true };
  } catch (error) {
    handleError(error);
    return { success: false, error };
  }
};

export const openHistory = (repoID, path, dirent) => {
  const filePath = Utils.joinPath(path, dirent.name);
  const url = URLDecorator.getUrl({ type: 'file_revisions', repoID, filePath });
  location.href = url;
};

export const openViaClient = (repoID, path, dirent) => {
  const filePath = Utils.joinPath(path, dirent.name);
  const url = URLDecorator.getUrl({ type: 'open_via_client', repoID, filePath });
  location.href = url;
};

export const openByDefault = (repoID, path, dirent) => {
  const filePath = Utils.joinPath(path, dirent.name);
  const url = URLDecorator.getUrl({ type: 'open_with_default', repoID, filePath });
  window.open(url, '_blank');
};

export const openWithOnlyOffice = (repoID, path, dirent) => {
  const filePath = Utils.joinPath(path, dirent.name);
  const url = URLDecorator.getUrl({ type: 'open_with_onlyoffice', repoID, filePath });
  window.open(url, '_blank');
};

export const convertWithOnlyOffice = (repoID, path, dirent) => {
  const filePath = Utils.joinPath(path, dirent.name);
  const url = URLDecorator.getUrl({ type: 'open_with_onlyoffice', repoID, filePath });
  window.open(url, '_blank');
};

export const freezeDocument = async (repoID, path, dirent, updateState) => {
  const filePath = Utils.joinPath(path, dirent.name);
  try {
    await seafileAPI.lockfile(repoID, filePath, -1);
    if (updateState) {
      updateState(dirent, {
        is_freezed: true,
        is_locked: true,
        locked_by_me: true,
        lock_owner_name: username.split('@')[0]
      });
    }
    return { success: true };
  } catch (error) {
    handleError(error);
    return { success: false, error };
  }
};
