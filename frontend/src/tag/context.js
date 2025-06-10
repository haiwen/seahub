import tagsAPI from './api';
import LocalStorage from '../metadata/utils/local-storage';
import EventBus from '../components/common/event-bus';
import { username, lang } from '../utils/constants';
import { Utils } from '../utils/utils';

class Context {

  constructor() {
    this.settings = { lang };
    this.repoId = '';
    this.api = null;
    this.localStorage = null;
    this.eventBus = null;
    this.hasInit = false;
    this.permission = 'r';
  }

  async init(settings) {
    if (this.hasInit) return;

    // init settings
    this.settings = { ...this.settings, ...settings };

    // init api
    const { repoInfo } = this.settings;
    this.api = tagsAPI;

    // init localStorage
    const { repoID } = this.settings;
    const localStorageName = `sf-metadata-tags-${repoID}`;
    this.localStorage = new LocalStorage(localStorageName);

    this.repoId = repoID;

    const eventBus = new EventBus();
    this.eventBus = eventBus;

    this.permission = repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw';
    const { isCustomPermission, customPermission } = Utils.getUserPermission(repoInfo.permission);
    this.customPermission = isCustomPermission ? customPermission : null;

    this.hasInit = true;
  }

  destroy = () => {
    this.settings = {};
    this.repoId = '';
    this.api = null;
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

  getPermission = () => {
    return this.permission;
  };

  canModify = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canPreview = () => {
    if (this.customPermission) {
      const { preview, modify } = this.customPermission.permission;
      return preview || modify;
    }
    return true;
  };

  canAddTag = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canModifyTag = (tag) => {
    if (this.permission === 'r') return false;
    return true;
  };

  checkCanDeleteTag = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  checkCanExportTags = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  canModifyTags = () => {
    if (this.permission === 'r') return false;
    return true;
  };

  // tags
  getTags = ({ start, limit }) => {
    return this.api.getTags(this.repoId, start, limit);
  };

  addTags = (tags = []) => {
    return this.api.addTags(this.repoId, tags);
  };

  modifyTags = (tags = []) => {
    return this.api.modifyTags(this.repoId, tags);
  };

  deleteTags = (tags = []) => {
    return this.api.deleteTags(this.repoId, tags);
  };

  addTagLinks = (link_column_key, row_id_map) => {
    return this.api.addTagLinks(this.repoId, link_column_key, row_id_map);
  };

  deleteTagLinks = (link_column_key, row_id_map) => {
    return this.api.deleteTagLinks(this.repoId, link_column_key, row_id_map);
  };

  mergeTags = (target_tag_id, merged_tags_ids) => {
    return this.api.mergeTags(this.repoId, target_tag_id, merged_tags_ids);
  };

  exportTags = (tagsIds) => {
    return this.api.exportTags(this.repoId, tagsIds);
  };

  importTags = (file) => {
    return this.api.importTags(this.repoId, file);
  };
}

export default Context;
