import { gettext } from './constants';

// item --> '' : {key : '', value : gettext('')};
const TextTranslation = {
  // app-menu
  NEW_FOLDER: {
    key: 'New Folder',
    value: gettext('New Folder')
  },
  NEW_FILE: {
    key: 'New File',
    value: gettext('New File')
  },
  NEW_MARKDOWN_FILE: {
    key: 'New Markdown File',
    value: gettext('New Markdown File')
  },
  NEW_EXCEL_FILE: {
    key: 'New Excel File',
    value: gettext('New Excel File')
  },
  NEW_POWERPOINT_FILE: {
    key: 'New PowerPoint File',
    value: gettext('New PowerPoint File')
  },
  NEW_WORD_FILE: {
    key: 'New Word File',
    value: gettext('New Word File')
  },
  NEW_TLDRAW_FILE: {
    key: 'New Whiteboard File',
    value: gettext('New Whiteboard File')
  },
  NEW_EXCALIDRAW_FILE: {
    key: 'New Excalidraw File',
    value: gettext('New Excalidraw File')
  },
  NEW_SEADOC_FILE: {
    key: 'New SeaDoc File',
    value: gettext('New SeaDoc File')
  },
  SHARE: {
    key: 'Share',
    value: gettext('Share')
  },
  DOWNLOAD: {
    key: 'Download',
    value: gettext('Download')
  },
  DELETE: {
    key: 'Delete',
    value: gettext('Delete')
  },
  RENAME: {
    key: 'Rename',
    value: gettext('Rename')
  },
  MOVE: {
    key: 'Move',
    value: gettext('Move')
  },
  COPY: {
    key: 'Copy',
    value: gettext('Copy')
  },
  PERMISSION: {
    key: 'Permission',
    value: gettext('Permission')
  },
  DETAILS: {
    key: 'Details',
    value: gettext('Details')
  },
  OPEN_VIA_CLIENT: {
    key: 'Open via Client',
    value: gettext('Open via Client')
  },
  LOCK: {
    key: 'Lock',
    value: gettext('Lock')
  },
  UNLOCK: {
    key: 'Unlock',
    value: gettext('Unlock')
  },
  FREEZE_DOCUMENT: {
    key: 'Freeze Document',
    value: gettext('Freeze Document')
  },
  UNFREEZE_DOCUMENT: {
    key: 'Unfreeze Document',
    value: gettext('Unfreeze Document')
  },
  FREEZE_PAGE: {
    key: 'Freeze page',
    value: gettext('Freeze page')
  },
  CONVERT_AND_EXPORT: {
    key: 'Convert & Export',
    value: gettext('Convert & Export')
  },
  CONVERT_TO_MARKDOWN: {
    key: 'Convert to Markdown',
    value: gettext('Convert to Markdown')
  },
  CONVERT_TO_SDOC: {
    key: 'Convert to sdoc',
    value: gettext('Convert to sdoc')
  },
  CONVERT_TO_DOCX: {
    key: 'Convert to docx',
    value: gettext('Convert to docx')
  },
  EXPORT_DOCX: {
    key: 'Export docx',
    value: gettext('Export as docx')
  },
  HISTORY: {
    key: 'History',
    value: gettext('History')
  },
  ACCESS_LOG: {
    key: 'Access Log',
    value: gettext('Access Log')
  },
  PROPERTIES: {
    key: 'Properties',
    value: gettext('Properties')
  },
  TAGS: {
    key: 'Tags',
    value: gettext('Tags')
  },
  TRASH: {
    key: 'Trash',
    value: gettext('Trash')
  },
  ONLYOFFICE_CONVERT: {
    key: 'Convert with ONLYOFFICE',
    value: gettext('Convert with ONLYOFFICE')
  },
  DISPLAY_FILES: {
    key: 'Display files',
    value: gettext('Display files')
  },
  EXPORT_SDOC: {
    key: 'Export sdoc',
    value: gettext('Export as zip')
  },

  // repo operations
  TRANSFER: {
    key: 'Transfer',
    value: gettext('Transfer')
  },
  FOLDER_PERMISSION: {
    key: 'Folder Permission',
    value: gettext('Folder Permission')
  },
  SHARE_ADMIN: {
    key: 'Share Admin',
    value: gettext('Share Admin')
  },
  CHANGE_PASSWORD: {
    key: 'Change Password',
    value: gettext('Change Password')
  },
  RESET_PASSWORD: {
    key: 'Reset Password',
    value: gettext('Reset Password')
  },
  UNWATCH_FILE_CHANGES: {
    key: 'Unwatch File Changes',
    value: gettext('Unwatch File Changes')
  },
  WATCH_FILE_CHANGES: {
    key: 'Watch File Changes',
    value: gettext('Watch File Changes')
  },
  ADVANCED: {
    key: 'advanced',
    value: gettext('Advanced')
  },

  // advanced operations
  API_TOKEN: {
    key: 'API Token',
    value: gettext('API Token')
  },
  LABEL_CURRENT_STATE: {
    key: 'Label Current State',
    value: gettext('Label Current State')
  },

  UNSHARE: {
    key: 'Unshare',
    value: gettext('Unshare')
  },

  // metadata views
  ADD_FOLDER: {
    key: 'ADD_FOLDER',
    value: gettext('Folder')
  },
  ADD_VIEW: {
    key: 'ADD_VIEW',
    value: gettext('Add view')
  },

  // table view
  OPEN_FILE_IN_NEW_TAB: {
    key: 'Open file in new tab',
    value: gettext('Open file in new tab'),
  },
  OPEN_FOLDER_IN_NEW_TAB: {
    key: 'Open folder in new tab',
    value: gettext('Open folder in new tab'),
  },
  OPEN_PARENT_FOLDER: {
    key: 'Open parent folder',
    value: gettext('Open parent folder'),
  },
  EXTRACT_FILE_DETAIL: {
    key: 'Extract file detail',
    value: gettext('Extract file detail'),
  },
  EXTRACT_FILE_DETAILS: {
    key: 'Extract file details',
    value: gettext('Extract file details'),
  },
  DELETE_FILE: {
    key: 'Delete file',
    value: gettext('Delete file'),
  },
  DELETE_FOLDER: {
    key: 'Delete folder',
    value: gettext('Delete folder'),
  },
  MOVE_FILE: {
    key: 'Move file',
    value: gettext('Move file'),
  },
  MOVE_FOLDER: {
    key: 'Move folder',
    value: gettext('Move folder'),
  },
  RENAME_FILE: {
    key: 'Rename file',
    value: gettext('Rename file'),
  },
  RENAME_FOLDER: {
    key: 'Rename folder',
    value: gettext('Rename folder'),
  },
  GENERATE_DESCRIPTION: {
    key: 'Generate description',
    value: gettext('Generate description'),
  },
  GENERATE_TAGS: {
    key: 'Generate tags',
    value: gettext('Generate file tags'),
  },
  OCR: {
    key: 'OCR',
    value: gettext('OCR'),
  },

  // tag view
  MERGE_TAGS: {
    key: 'Merge tags',
    value: gettext('Merge tags'),
  },
  NEW_CHILD_TAG: {
    key: 'New child tag',
    value: gettext('New child tag'),
  },
};

export default TextTranslation;
