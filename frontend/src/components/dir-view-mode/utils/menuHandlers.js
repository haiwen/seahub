import TextTranslation from '@/utils/text-translation';
import { lockFile, unlockFile, freezeDocument, exportDocx, exportSdoc, openHistory, openViaClient, openByDefault, openWithOnlyOffice, toggleStar } from '@/utils/dirent-operations';
import { EVENT_BUS_TYPE } from '@/components/common/event-bus-type';
import { EVENT_BUS_TYPE as SF_TABLE_EVENT_BUS_TYPE } from '@/components/sf-table/constants/event-bus-type';
import EventBus from '@/components/common/event-bus';
import { Dirent } from '@/models';
import { Utils } from '@/utils/utils';
import { seafileAPI } from '@/utils/seafile-api';

// Base handlers that all dirent views can use
export const menuHandlers = {
  [TextTranslation.DOWNLOAD.key]: ({ eventBus, path, dirents }) => {
    const direntList = dirents instanceof Dirent ? [dirents.toJson()] : dirents;
    eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_FILE, path, direntList);
  },

  [TextTranslation.DELETE.key]: ({ onBatchDelete, dirents }) => {
    if (onBatchDelete) {
      onBatchDelete(dirents);
    }
  },

  [TextTranslation.MOVE.key]: ({ eventBus, path, dirents, isBatch }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.MOVE_FILE, path, dirents, isBatch);
  },

  [TextTranslation.COPY.key]: ({ eventBus, path, dirents, isBatch }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.COPY_FILE, path, dirents, isBatch);
  },

  [TextTranslation.RENAME.key]: () => {
    const sfTableEventBus = EventBus.getInstance();
    sfTableEventBus.dispatch(SF_TABLE_EVENT_BUS_TYPE.OPEN_EDITOR);
  },

  [TextTranslation.LOCK.key]: ({ repoID, path, dirent, updateDirentProperties }) => {
    lockFile(repoID, path, dirent, updateDirentProperties);
  },

  [TextTranslation.UNLOCK.key]: ({ repoID, path, dirent, updateDirentProperties }) => {
    unlockFile(repoID, path, dirent, updateDirentProperties);
  },

  [TextTranslation.FREEZE_DOCUMENT.key]: ({ repoID, path, dirent, updateDirentProperties }) => {
    freezeDocument(repoID, path, dirent, updateDirentProperties);
  },

  [TextTranslation.UNFREEZE_DOCUMENT.key]: ({ repoID, path, dirent, updateDirentProperties }) => {
    unlockFile(repoID, path, dirent, updateDirentProperties);
  },

  [TextTranslation.HISTORY.key]: ({ repoID, path, dirent }) => {
    openHistory(repoID, path, dirent);
  },

  [TextTranslation.ACCESS_LOG.key]: ({ eventBus, path, dirent }) => {
    const fullPath = Utils.joinPath(path, dirent.name);
    eventBus.dispatch(EVENT_BUS_TYPE.ACCESS_LOG, fullPath, dirent.name);
  },

  [TextTranslation.PROPERTIES.key]: ({ showDirentDetail }) => {
    showDirentDetail && showDirentDetail('info');
  },

  [TextTranslation.OPEN_WITH_DEFAULT.key]: ({ repoID, path, dirent }) => {
    openByDefault(repoID, path, dirent);
  },

  [TextTranslation.OPEN_VIA_CLIENT.key]: ({ repoID, path, dirent }) => {
    openViaClient(repoID, path, dirent);
  },

  [TextTranslation.OPEN_WITH_ONLYOFFICE.key]: ({ repoID, path, dirent }) => {
    openWithOnlyOffice(repoID, path, dirent);
  },

  [TextTranslation.CONVERT_TO_MARKDOWN.key]: ({ onItemConvert, dirent }) => {
    onItemConvert && onItemConvert(dirent, 'markdown');
  },

  [TextTranslation.CONVERT_TO_DOCX.key]: ({ onItemConvert, dirent }) => {
    onItemConvert && onItemConvert(dirent, 'docx');
  },

  [TextTranslation.EXPORT_DOCX.key]: ({ repoID, path, dirent }) => {
    exportDocx(repoID, path, dirent);
  },

  [TextTranslation.CONVERT_TO_SDOC.key]: ({ onItemConvert, dirent }) => {
    onItemConvert && onItemConvert(dirent, 'sdoc');
  },

  [TextTranslation.EXPORT_SDOC.key]: ({ repoID, path, dirent }) => {
    exportSdoc(repoID, path, dirent);
  },

  [TextTranslation.NEW_FOLDER.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, path, direntList);
  },

  [TextTranslation.NEW_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList);
  },

  [TextTranslation.NEW_MARKDOWN_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.md');
  },

  [TextTranslation.NEW_EXCEL_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.xlsx');
  },

  [TextTranslation.NEW_POWERPOINT_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.pptx');
  },

  [TextTranslation.NEW_WORD_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.docx');
  },

  [TextTranslation.NEW_TLDRAW_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.draw');
  },

  [TextTranslation.NEW_EXCALIDRAW_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.exdraw');
  },

  [TextTranslation.NEW_SEADOC_FILE.key]: ({ eventBus, path, direntList }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, '.sdoc');
  },

  [TextTranslation.SHARE.key]: ({ eventBus, path, dirent }) => {
    const direntPath = Utils.joinPath(path, dirent.name);
    eventBus.dispatch(EVENT_BUS_TYPE.SHARE_FILE, direntPath, dirent);
  },

  [TextTranslation.PERMISSION.key]: ({ eventBus, path, dirent }) => {
    const direntPath = Utils.joinPath(path, dirent.name);
    const name = Utils.getFileName(direntPath);
    eventBus.dispatch(EVENT_BUS_TYPE.PERMISSION, direntPath, name);
  },

  [TextTranslation.STAR.key]: ({ dirent, repoID, path, updateDirentProperties }) => {
    toggleStar(dirent, repoID, path, updateDirentProperties);
  },

  [TextTranslation.UNSTAR.key]: ({ dirent, repoID, path, updateDirentProperties }) => {
    toggleStar(dirent, repoID, path, updateDirentProperties);
  },

  [TextTranslation.ONLYOFFICE_CONVERT.key]: async ({ repoID, path, dirent, loadDirentList }) => {
    const filePath = Utils.joinPath(path, dirent.name);
    const res = await seafileAPI.onlyofficeConvert(repoID, filePath);
    loadDirentList && loadDirentList(res.data.parent_dir);
  },
};
