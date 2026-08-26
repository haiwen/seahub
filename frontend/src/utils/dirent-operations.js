import { seafileAPI } from './seafile-api';
import { Utils } from './utils';
import { gettext, name } from './constants';
import { username } from '@/utils/constants';
import URLDecorator from './url-decorator';
import toaster from '../components/toast';

export const handleError = (error) => {
  toaster.danger(Utils.getErrorMsg(error));
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
        lock_owner_name: name
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

export const batchLockFile = async (repoID, repoInfo, dirents, updateState) => {
  const targetFiles = dirents.filter(dirent => dirent.permission == 'rw' && !dirent.name.endsWith('.sdoc') && !dirent.is_locked);
  const paths = targetFiles.map(dirent => Utils.joinPath(dirent.parent_dir, dirent.name));
  const onUpdate = updateState && ((successPaths, updates) => {
    successPaths.forEach((successPath) => {
      const dirent = targetFiles.find((d) => Utils.joinPath(d.parent_dir, d.name) === successPath);
      if (dirent) {
        updateState(dirent, updates);
      }
    });
  });
  return batchLockUnlockFile(repoID, 'lock', paths, onUpdate);
};

export const batchUnlockFile = async (repoID, repoInfo, dirents, updateState) => {
  const isRepoOwner = repoInfo.owner_email === username;
  const isAdmin = repoInfo.is_admin;
  const targetFiles = dirents.filter(dirent => dirent.permission == 'rw' && !dirent.name.endsWith('.sdoc') && dirent.is_locked && (dirent.locked_by_me || dirent.lock_owner == 'OnlineOffice' || isRepoOwner || isAdmin));
  const paths = targetFiles.map(dirent => Utils.joinPath(dirent.parent_dir, dirent.name));
  const onUpdate = updateState && ((successPaths, updates) => {
    successPaths.forEach((successPath) => {
      const dirent = targetFiles.find((d) => Utils.joinPath(d.parent_dir, d.name) === successPath);
      if (dirent) {
        updateState(dirent, updates);
      }
    });
  });
  return batchLockUnlockFile(repoID, 'unlock', paths, onUpdate);
};

export const batchLockUnlockFile = async (repoID, operation, paths, updateState) => {
  try {
    const res = await seafileAPI.batchLockUnlockFile(repoID, operation, paths);
    const successPaths = res.data.success || [];
    const failed = res.data.failed || [];

    if (updateState && successPaths.length > 0) {
      const isLock = operation === 'lock';
      updateState(successPaths, {
        is_locked: isLock,
        locked_by_me: isLock,
        lock_owner_name: isLock ? name : ''
      });
      const fileName = Utils.getFileName(successPaths[0]);
      let msg;
      if (successPaths.length === 1) {
        msg = isLock
          ? gettext('Successfully locked {name}.').replace('{name}', fileName)
          : gettext('Successfully unlocked {name}.').replace('{name}', fileName);
      } else {
        msg = isLock
          ? gettext('Successfully locked {name} and {n} other items.').replace('{name}', fileName).replace('{n}', successPaths.length - 1)
          : gettext('Successfully unlocked {name} and {n} other items.').replace('{name}', fileName).replace('{n}', successPaths.length - 1);
      }
      toaster.success(msg);
    }

    if (failed.length > 0) {
      failed.forEach((item) => {
        const { path, error_msg } = item;
        toaster.danger(`${path}: ${error_msg}`);
      });
    }
  } catch (error) {
    handleError(error);
  }
};

export const exportDocx = (repoID, path, dirent) => {
  const serviceUrl = window.app.config.serviceURL;
  const filePath = Utils.joinPath(path, dirent.name);
  const exportUrl = `${serviceUrl}/repo/sdoc_export_to_docx/${repoID}/?file_path=${encodeURIComponent(filePath)}`;
  window.location.href = exportUrl;
};

export const exportMarkdown = (repoID, path, dirent) => {
  const serviceUrl = window.app.config.serviceURL;
  const filePath = Utils.joinPath(path, dirent.name);
  const exportUrl = `${serviceUrl}/repo/sdoc_export_to_markdown/${repoID}/?file_path=${encodeURIComponent(filePath)}`;
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
  const currentState = dirent.starred;
  try {
    if (currentState) {
      await seafileAPI.unstarItem(repoID, filePath);
    } else {
      await seafileAPI.starItem(repoID, filePath);
    }
    if (updateState) {
      updateState(dirent, { starred: !currentState });
    }
    let msg = '';
    if (currentState) {
      msg = gettext('Successfully unstarred {name_placeholder}').replace('{name_placeholder}', dirent.name);
    } else {
      msg = gettext('Successfully starred {name_placeholder}').replace('{name_placeholder}', dirent.name);
    }
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
        lock_owner_name: name
      });
    }
    return { success: true };
  } catch (error) {
    handleError(error);
    return { success: false, error };
  }
};
