import metadataAPI from '../api';
import { UserService, LocalStorage } from './_basic';
import EventBus from './utils/event-bus';

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
    const { localStorageName } = this.settings;
    this.localStorage = new LocalStorage(localStorageName);

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

  // metadata
  getMetadata = (repoID) => {
    return this.metadataAPI.getMetadata(repoID);
  };

  canModifyCell = (column) => {
    return false;
  };

  canModifyRow = (row) => {
    return false;
  };

  getPermission = () => {
    return 'rw';
  };

  getCollaboratorsFromCache = () => {
    //
  };
}

export default Context;
