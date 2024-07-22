import metadataAPI from '../api';
import { UserService, LocalStorage } from './_basic';
import EventBus from '../../components/common/event-bus';
import { username } from '../../utils/constants';

class Context {

  constructor() {
    this.settings = {};
    this.metadataAPI = null;
    this.localStorage = null;
    this.userService = null;
    this.eventBus = null;
    this.hasInit = false;
  }

  async init({ otherSettings }) {
    if (this.hasInit) return;

    // init settings
    this.settings = otherSettings || {};

    // init metadataAPI
    const { mediaUrl } = this.settings;
    this.metadataAPI = metadataAPI;

    // init localStorage
    const { repoID, viewID } = this.settings;
    this.localStorage = new LocalStorage(`sf-metadata-${repoID}-${viewID}`);

    // init userService
    this.userService = new UserService({ mediaUrl, api: this.metadataAPI.listUserInfo });

    const eventBus = new EventBus();
    this.eventBus = eventBus;

    this.hasInit = true;
  }

  destroy = () => {
    this.settings = {};
    this.metadataAPI = null;
    this.localStorage = null;
    this.userService = null;
    this.eventBus = null;
    this.hasInit = false;
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
    const repoID = this.settings['repoID'];
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

  canModifyCell = (column) => {
    const { editable } = column;
    if (!editable) return false;
    return true;
  };

  canModifyRow = (row) => {
    return true;
  };

  getPermission = () => {
    return 'rw';
  };

  getCollaboratorsFromCache = () => {
    //
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

  insertColumn = (repoId, name, type, { key, data }) => {
    return this.metadataAPI.insertColumn(repoId, name, type, { key, data });
  };

  modifyRecord = (repoId, recordId, columnName, value) => {
    return this.metadataAPI.modifyRecord(repoId, recordId, columnName, value);
  };

  modifyRecords = (repoId, recordsData, isCopyPaste) => {
    return this.metadataAPI.modifyRecords(repoId, recordsData, isCopyPaste);
  };

  modifyView = (repoId, viewId, viewData) => {
    return this.metadataAPI.modifyView(repoId, viewId, viewData);
  };

  getRowsByIds = () => {
    // todo
  };

}

export default Context;
