export default class WikiConfig {
  constructor(object) {
    this.version = object.version || 1;
    this.wiki_name = object.wiki_name || '';
    this.wiki_icon = object.wiki_icon || '';
    this.navigation = object.navigation || [];
    this.pages = object.pages || [];
  }
}
