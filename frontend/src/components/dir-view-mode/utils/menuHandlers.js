import TextTranslation from '@/utils/text-translation';
import { lockFile, unlockFile, freezeDocument, exportDocx, exportMarkdown, exportSdoc, openHistory, openViaClient, openByDefault, openWithOnlyOffice, toggleStar } from '@/utils/dirent-operations';
import EventBus, { eventBus as globalEventBus } from '@/components/common/event-bus';
import { EVENT_BUS_TYPE } from '@/components/common/event-bus-type';
import { Dirent } from '@/models';
import { Utils } from '@/utils/utils';
import { seafileAPI } from '@/utils/seafile-api';
import { AttachmentObject } from '../dir-chat/models';
import { setPendingAttachments } from '../dir-chat/hooks/ai-chat-tools';

// Base handlers that all dirent views can use
export const menuHandlers = {
  [TextTranslation.DOWNLOAD.key]: ({ eventBus, path, dirents }) => {
    const direntList = dirents instanceof Dirent ? [dirents.toJson()] : dirents;
    eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_FILE, path, direntList);
  },

  [TextTranslation.CHAT_WITH_AI.key]: ({ path, repoID, dirent, dirents, isBatch }) => {
    const targetDirents = Array.isArray(dirents) ? dirents : [dirent || dirents].filter(Boolean);
    const attachments = targetDirents
      .filter((item) => item?.type === 'file')
      .map((item) => new AttachmentObject({
        repo_id: repoID,
        path: Utils.joinPath(path, item.name),
        name: item.name,
      }));

    setPendingAttachments(attachments, !isBatch);
    globalEventBus.dispatch(EVENT_BUS_TYPE.SWITCH_TO_CHAT_VIEW);
    if (attachments.length > 0) {
      EventBus.getInstance().dispatch(EVENT_BUS_TYPE.CHAT_ATTACH_FILES, {
        attachments,
        reset: !isBatch,
      });
    }
  },

  [TextTranslation.DELETE.key]: ({ dirent, isBatch, onItemDelete, onBatchDelete }) => {
    if (!isBatch) {
      onItemDelete(dirent);
    } else {
      onBatchDelete && onBatchDelete();
    }
  },

  [TextTranslation.MOVE.key]: ({ eventBus, path, dirents, isBatch }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.MOVE_FILE, path, dirents, isBatch);
  },

  [TextTranslation.COPY.key]: ({ eventBus, path, dirents, isBatch }) => {
    eventBus.dispatch(EVENT_BUS_TYPE.COPY_FILE, path, dirents, isBatch);
  },

  [TextTranslation.RENAME.key]: ({ onItemRename }) => {
    onItemRename && onItemRename();
  },

  [TextTranslation.LOCK.key]: ({ repoID, path, dirent, updateDirent }) => {
    lockFile(repoID, path, dirent, updateDirent);
  },

  [TextTranslation.UNLOCK.key]: ({ repoID, path, dirent, updateDirent }) => {
    unlockFile(repoID, path, dirent, updateDirent);
  },

  [TextTranslation.FREEZE_DOCUMENT.key]: ({ repoID, path, dirent, updateDirent }) => {
    freezeDocument(repoID, path, dirent, updateDirent);
  },

  [TextTranslation.UNFREEZE_DOCUMENT.key]: ({ repoID, path, dirent, updateDirent }) => {
    unlockFile(repoID, path, dirent, updateDirent);
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

  [TextTranslation.EXPORT_MARKDOWN.key]: ({ repoID, path, dirent }) => {
    exportMarkdown(repoID, path, dirent);
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

  [TextTranslation.STAR.key]: ({ dirent, repoID, path, updateDirent }) => {
    toggleStar(repoID, path, dirent, updateDirent);
  },

  [TextTranslation.UNSTAR.key]: ({ dirent, repoID, path, updateDirent }) => {
    toggleStar(repoID, path, dirent, updateDirent);
  },

  [TextTranslation.ONLYOFFICE_CONVERT.key]: async ({ repoID, path, dirent, loadDirentList }) => {
    const filePath = Utils.joinPath(path, dirent.name);
    const res = await seafileAPI.onlyofficeConvert(repoID, filePath);
    loadDirentList && loadDirentList(res.data.parent_dir);
  },
};
