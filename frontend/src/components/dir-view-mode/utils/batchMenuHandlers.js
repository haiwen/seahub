import TextTranslation from '@/utils/text-translation';

// Note: This file is deprecated
// All menu handling logic should use menuHandlers from menuHandlers.js
// This file is kept for backward compatibility

export const createBatchMenuHandlers = (handlers) => {
  return {
    [TextTranslation.DOWNLOAD.key]: () => {
      handlers.onDownload && handlers.onDownload();
    },
    [TextTranslation.DELETE.key]: () => {
      handlers.onItemsDelete && handlers.onItemsDelete();
    },
    [TextTranslation.MOVE.key]: () => {
      handlers.onMove && handlers.onMove();
    },
    [TextTranslation.COPY.key]: () => {
      handlers.onCopy && handlers.onCopy();
    },
  };
};

export const createSingleMenuHandlers = (handlers) => {
  return {
    [TextTranslation.DOWNLOAD.key]: (operation, currentObject) => {
      handlers.onDownload && handlers.onDownload(currentObject);
    },
    [TextTranslation.DELETE.key]: (operation, currentObject) => {
      handlers.onDelete && handlers.onDelete(currentObject);
    },
    [TextTranslation.MOVE.key]: (operation, currentObject) => {
      handlers.onMove && handlers.onMove(currentObject);
    },
    [TextTranslation.COPY.key]: (operation, currentObject) => {
      handlers.onCopy && handlers.onCopy(currentObject);
    },
    [TextTranslation.RENAME.key]: (operation, currentObject) => {
      handlers.onRename && handlers.onRename(currentObject);
    },
    [TextTranslation.LOCK.key]: (operation, currentObject) => {
      handlers.onLock && handlers.onLock(currentObject);
    },
    [TextTranslation.UNLOCK.key]: (operation, currentObject) => {
      handlers.onUnlock && handlers.onUnlock(currentObject);
    },
    [TextTranslation.HISTORY.key]: (operation, currentObject) => {
      handlers.onHistory && handlers.onHistory(currentObject);
    },
    [TextTranslation.ACCESS_LOG.key]: (operation, currentObject) => {
      handlers.onAccessLog && handlers.onAccessLog(currentObject);
    },
    [TextTranslation.PROPERTIES.key]: (operation, currentObject) => {
      handlers.onProperties && handlers.onProperties(currentObject);
    },
    [TextTranslation.OPEN_WITH_DEFAULT.key]: (operation, currentObject) => {
      handlers.onOpenWithDefault && handlers.onOpenWithDefault(currentObject);
    },
    [TextTranslation.OPEN_VIA_CLIENT.key]: (operation, currentObject) => {
      handlers.onOpenViaClient && handlers.onOpenViaClient(currentObject);
    },
    [TextTranslation.OPEN_WITH_ONLYOFFICE.key]: (operation, currentObject) => {
      handlers.onOpenWithOnlyOffice && handlers.onOpenWithOnlyOffice(currentObject);
    },
    [TextTranslation.CONVERT_TO_MARKDOWN.key]: (operation, currentObject) => {
      handlers.onConvertToMarkdown && handlers.onConvertToMarkdown(currentObject);
    },
    [TextTranslation.CONVERT_TO_DOCX.key]: (operation, currentObject) => {
      handlers.onConvertToDocx && handlers.onConvertToDocx(currentObject);
    },
    [TextTranslation.CONVERT_TO_SDOC.key]: (operation, currentObject) => {
      handlers.onConvertToSdoc && handlers.onConvertToSdoc(currentObject);
    },
    [TextTranslation.EXPORT_DOCX.key]: (operation, currentObject) => {
      handlers.onExportDocx && handlers.onExportDocx(currentObject);
    },
    [TextTranslation.EXPORT_SDOC.key]: (operation, currentObject) => {
      handlers.onExportSdoc && handlers.onExportSdoc(currentObject);
    },
  };
};
