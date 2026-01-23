import metadataAPI from './api';
import { repoTrashAPI } from '../utils/repo-trash-api';
import { seafileAPI } from '../utils/seafile-api';
import tagsAPI from '../tag/api';
import {
  PRIVATE_COLUMN_KEYS, EDITABLE_DATA_PRIVATE_COLUMN_KEYS, EDITABLE_PRIVATE_COLUMN_KEYS, DELETABLE_PRIVATE_COLUMN_KEY,
  FACE_RECOGNITION_VIEW_ID
} from './constants';
import LocalStorage from './utils/local-storage';
import EventBus from '../components/common/event-bus';
import { username, lang } from '../utils/constants';
import { Utils } from '../utils/utils';

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
    const { isCustomPermission, customPermission } = Utils.getUserPermission(repoInfo.permission);
    this.customPermission = isCustomPermission ? customPermission : null;

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

  getTrashData = (page) => {
    const repoID = this.settings['repoID'];
    const per_page = 100;
    return repoTrashAPI.getRepoFolderTrash(repoID, page, per_page);
  };

  loadTrashFolderRecords = (commitID, baseDir, folderPath) => {
    const repoID = this.settings['repoID'];
    return seafileAPI.listCommitDir(repoID, commitID, `${baseDir.substr(0, baseDir.length - 1)}${folderPath}`);
  };

  restoreTrashItems = (items) => {
    const repoID = this.settings['repoID'];
    return repoTrashAPI.restoreTrashItems(repoID, items);
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

  canInsertColumn = () => {
    if (this.permission === 'r') return false;
    return true;
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

  canRemovePhotoFromPeople = () => {
    const viewId = this.getSetting('viewID');
    return viewId === FACE_RECOGNITION_VIEW_ID;
  };

  canAddPhotoToPeople = () => {
    const viewId = this.getSetting('viewID');
    return viewId === FACE_RECOGNITION_VIEW_ID;
  };

  canSetPeoplePhoto = () => {
    const viewId = this.getSetting('viewID');
    if (this.permission === 'r' || viewId !== FACE_RECOGNITION_VIEW_ID) {
      return false;
    }
    return true;
  };

  canPreview = () => {
    if (this.customPermission) {
      const { preview, modify } = this.customPermission.permission;
      return preview || modify;
    }
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

  imageCaption = (filePath, recordId) => {
    const repoID = this.settings['repoID'];
    const lang = this.settings['lang'];
    return this.metadataAPI.imageCaption(repoID, filePath, lang, recordId);
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

  addPeoplePhotos = (peopleIds, recordIds) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.addPeoplePhotos(repoID, peopleIds, recordIds);
  };

  removePeoplePhotos = (recordId, photoIds) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.removePeoplePhotos(repoID, recordId, photoIds);
  };

  setPeoplePhoto = (recordId, photoId) => {
    const repoID = this.settings['repoID'];
    return this.metadataAPI.setPeoplePhoto(repoID, recordId, photoId);
  };

  // file tag
  updateFileTags = (data) => {
    const repoID = this.settings['repoID'];
    return this.tagsAPI.updateFileTags(repoID, data);
  };

}

export default Context;
