import metadataAPI from './api';
import tagsAPI from '../tag/api';
import {
  PRIVATE_COLUMN_KEYS, EDITABLE_DATA_PRIVATE_COLUMN_KEYS, EDITABLE_PRIVATE_COLUMN_KEYS, DELETABLE_PRIVATE_COLUMN_KEY,
  FACE_RECOGNITION_VIEW_ID,
} from './constants';
import LocalStorage from './utils/local-storage';
import EventBus from '../components/common/event-bus';
import { username, lang } from '../utils/constants';

class Context {

  constructor() {
    this.settings = { lang };
    this.metadataAPI = null;
    this.tagsAPI = null;
    this.localStorage = null;
    this.eventBus = null;
    this.hasInit = false;
    this.permission = 'r';
    this.collaboratorsCache = {};
  }

  async init(settings) {
    if (this.hasInit) return;

    // init settings
    this.settings = { ...this.settings, ...settings };

    // init API
    const { repoInfo } = this.settings;
    this.metadataAPI = metadataAPI;
    this.tagsAPI = tagsAPI;

    // init localStorage
    const { repoID, viewID } = this.settings;
    const localStorageName = viewID ? `sf-metadata-${repoID}-${viewID}` : `sf-metadata-${repoID}`;
    this.localStorage = new LocalStorage(localStorageName);

    const eventBus = new EventBus();
    this.eventBus = eventBus;

    this.permission = repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw';

    this.hasInit = true;
  }

  destroy = () => {
    this.settings = {};
    this.metadataAPI = null;
    this.tagsAPI = null;
    this.localStorage = null;
    this.eventBus = null;
    this.hasInit = false;
    this.permission = 'r';
  };

  getSetting = (key) => {
    if (this.settings[key] === false) return this.settings[key];
    return this.settings[key] || '';
  };

  setSetting = (key, value) => {
    this.settings[key] = value;
  };

  getUsername = () => {
    return username;
  };

  // collaborators
  getCollaborators = () => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.getCollaborators(repoID);
  };

  // metadata
  getMetadata = (params) => {
    if (!this.metadataAPI) return null;
    const repoID = this.settings['repoID'];
    const { view_id, start, limit } = params;
    if (view_id === FACE_RECOGNITION_VIEW_ID) {
      return this.metadataAPI.getFaceData(repoID, start, limit);
    }

    return this.metadataAPI.getMetadata(repoID, params);
  };

  getViews = () => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.listViews(repoID);
  };

  getView = (viewId) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.getView(repoID, viewId);
  };

  getPermission = () => {
    return this.permission;
  };

  canModify = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canModifyRow = (row) => {
    if (this.permission === 'r') return false;
    return true;
  };

  checkCanDeleteRow = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canModifyRows = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canDuplicateRow = () => {
    if (this.permission === 'r') return false;
    const viewId = this.getSetting('viewID');
    return viewId !== FACE_RECOGNITION_VIEW_ID;
  };

  canModifyColumn = (column) => {
    if (this.permission === 'r') return false;
    const { editable } = column;
    if (!editable) return false;
    if (PRIVATE_COLUMN_KEYS.includes(column.key) && !EDITABLE_PRIVATE_COLUMN_KEYS.includes(column.key)) return false;
    return true;
  };

  canRenameColumn = (column) => {
    if (this.permission === 'r') return false;
    if (PRIVATE_COLUMN_KEYS.includes(column.key)) return false;
    return true;
  };

  canModifyColumnData = (column) => {
    if (this.permission === 'r') return false;
    const { key } = column;
    if (PRIVATE_COLUMN_KEYS.includes(key)) return EDITABLE_DATA_PRIVATE_COLUMN_KEYS.includes(key);
    return true;
  };

  canDeleteColumn = (column) => {
    if (this.permission === 'r') return false;
    const { key } = column;
    if (PRIVATE_COLUMN_KEYS.includes(key)) return DELETABLE_PRIVATE_COLUMN_KEY.includes(key);
    return true;
  };

  canModifyColumnOrder = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canModifyView = (view) => {
    if (this.permission === 'r') return false;
    return true;
  };

  restoreRows = () => {
    // todo
  };

  updateRows = () => {
    // todo
  };

  lockRowViaButton = () => {
    // todo
  };

  updateRowViaButton = () => {
    // todo
  };

  // column
  insertColumn = (repoId, name, type, { key, data }) => {
    return this.metadataAPI.insertColumn(repoId, name, type, { key, data });
  };

  deleteColumn = (repoId, columnKey) => {
    return this.metadataAPI.deleteColumn(repoId, columnKey);
  };

  renameColumn = (repoId, columnKey, name) => {
    return this.metadataAPI.renameColumn(repoId, columnKey, name);
  };

  modifyColumnData = (repoId, columnKey, data) => {
    return this.metadataAPI.modifyColumnData(repoId, columnKey, data);
  };

  // record
  modifyRecord = (repoId, recordId, update) => {
    return this.metadataAPI.modifyRecord(repoId, { recordId }, update);
  };

  modifyRecords = (repoId, recordsData, isCopyPaste) => {
    return this.metadataAPI.modifyRecords(repoId, recordsData, isCopyPaste);
  };

  batchDeleteFiles = (repoId, fileNames) => {
    return this.metadataAPI.batchDeleteFiles(repoId, fileNames);
  };

  // view
  modifyView = (repoId, viewId, viewData) => {
    return this.metadataAPI.modifyView(repoId, viewId, viewData);
  };

  getRowsByIds = () => {
    // todo
  };

  // ai
  generateDescription = (filePath) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.generateDescription(repoID, filePath);
  };

  imageCaption = (filePath) => {
    const repoID = this.settings['repoID'];
    const lang = this.settings['lang'];
    return this.metadataAPI.imageCaption(repoID, filePath, lang);
  };

  generateFileTags = (filePath) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.generateFileTags(repoID, filePath);
  };

  ocr = (filePath) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.ocr(repoID, filePath);
  };

  extractFileDetails = (objIds) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.extractFileDetails(repoID, objIds);
  };

  // face api
  renamePeople = (recordId, name) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.renamePeople(repoID, recordId, name);
  };

  getPeoplePhotos = (recordId, start, limit) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.getPeoplePhotos(repoID, recordId, start, limit);
  };

  // file tag
  updateFileTags = (data) => {
    const repoID = this.settings['repoID'];
    return this.tagsAPI.updateFileTags(repoID, data);
  };

}

export default Context;
