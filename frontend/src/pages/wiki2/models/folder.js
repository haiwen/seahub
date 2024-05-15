export default class Folder {
  constructor(object) {
    this.type = 'folder';
    this.id = object.id;
    this.name = object.name;
    this.icon = object.icon;
    this.children = object.children || [];
  }
}
