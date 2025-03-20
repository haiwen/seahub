class Page {
  constructor(object) {
    this.id = object.id;
    this.name = object.name;
    this.path = object.path;
    this.icon = object.icon;
    this.docUuid = object.docUuid;
    this.cover_img_url = object.cover_img_url;
    this.children = Array.isArray(object.children) ? object.children.map(item => new Page(item)) : [];
    this.locked = object.locked;
  }
}

export default Page;
