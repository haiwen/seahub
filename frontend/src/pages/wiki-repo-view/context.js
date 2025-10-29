import LocalStorage from '@/metadata/utils/local-storage';
import EventBus from '@/components/common/event-bus';
import tagsAPI from '@/tag/api';
import { username, lang } from '@/utils/constants';
import metadataAPI from './api';

const { wikiID } = window.app.pageOptions;

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
    this.metadataAPI = metadataAPI;
    this.tagsAPI = tagsAPI;

    // init localStorage
    const { repoID, viewID } = this.settings;
    const localStorageName = viewID ? `sf-metadata-${repoID}-${viewID}` : `sf-metadata-${repoID}`;
    this.localStorage = new LocalStorage(localStorageName);

    const eventBus = new EventBus();
    this.eventBus = eventBus;

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
    const { view_id } = params;

    return this.metadataAPI.getMetadata(wikiID, view_id, params);
  };

  getView = (viewId) => {
    return this.metadataAPI.getView(wikiID, viewId);
  };

  // file tag
  updateFileTags = (data) => {
    const repoID = this.settings['repoID'];
    return this.tagsAPI.updateFileTags(repoID, data);
  };

  canInsertColumn = () => {};
  canModify = () => {};
  canModifyRow = () => {};
  canModifyColumn = () => {};
  canModifyColumnOrder = () => {};
  canModifyRows = () => {};
  canPreview = () => {};
  canModifyView = () => {};

}

export default Context;
