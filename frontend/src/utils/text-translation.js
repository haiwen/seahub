import { gettext } from './constants';

// item --> '' : {key : '', value : gettext('')};
const TextTranslation = {
  // app-menu
  'NEW_FOLDER' : {key : 'New Folder', value : gettext('New Folder')},
  'NEW_FILE' : {key : 'New File', value : gettext('New File')},
  'SHARE' : {key : 'Share', value : gettext('Share')},
  'DOWNLOAD' : {key : 'Download', value : gettext('Download')},
  'DELETE' : {key : 'Delete', value : gettext('Delete')},
  'RENAME' : {key : 'Rename', value : gettext('Rename')},
  'MOVE' : {key : 'Move', value : gettext('Move')},
  'COPY' : {key : 'Copy', value : gettext('Copy')},
  'PERMISSION' : {key : 'Permission', value : gettext('Permission')},
  'DETAILS' : {key : 'Details', value : gettext('Details')},
  'OPEN_VIA_CLIENT' : {key : 'Open via Client', value : gettext('Open via Client')},
  'LOCK' : {key : 'Lock', value : gettext('Lock')},
  'UNLOCK' : {key : 'Unlock', value : gettext('Unlock')},
  'MASK_AS_DRAFT' : {key : 'Mask as draft', value : gettext('Mark as draft')},
  'UNMASK_AS_DRAFT' : {key : 'Unmask as draft', value : gettext('Unmark as draft')},
  'COMMENT' : {key : 'Comment', value : gettext('Comment')},
  'HISTORY' : {key : 'History', value : gettext('History')},
  'ACCESS_LOG' : {key : 'Access Log', value : gettext('Access Log')},
  'TAGS': {key: 'Tags', value: gettext('Tags')},
  'ONLYOFFICE_CONVERT': {key: 'Convert with ONLYOFFICE', value: gettext('Convert with ONLYOFFICE')}
};

export default TextTranslation;
