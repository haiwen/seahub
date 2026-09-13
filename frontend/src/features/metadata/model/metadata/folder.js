import { VIEWS_TYPE_FOLDER } from '../../constants';

export default class Folder {
  constructor(object) {
    this._id = object._id || '';
    this.name = object.name || '';
    this.type = object.type || VIEWS_TYPE_FOLDER;
    this.children = Array.isArray(object.children) ? object.children : [];
  }
}
