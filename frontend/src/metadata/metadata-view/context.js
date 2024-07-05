import metadataAPI from '../api';
import { UserService, LocalStorage } from './_basic';
import EventBus from './utils/event-bus';
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
    const { repoID } = this.settings;
    this.localStorage = new LocalStorage(`sf-metadata-${repoID}`);

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

  canModifyCell = (column) => {
    return false;
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

  getRowsByIds = () => {
    // todo
  };

}

export default Context;
