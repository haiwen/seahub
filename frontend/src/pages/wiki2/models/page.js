class Page {
  constructor(object) {
    this.id = object.id;
    this.name = object.name;
    this.path = object.path;
    this.icon = object.icon;
    this.docUuid = object.docUuid;
    this.coverImgUrl = object.coverImgUrl;
    this.children = Array.isArray(object.children) ? object.children.map(item => new Page(item)) : [];
  }
}

export default Page;
