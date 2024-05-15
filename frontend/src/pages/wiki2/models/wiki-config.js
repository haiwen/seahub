export default class WikiConfig {
  constructor(object) {
    this.version = object.version || 1;
    this.navigation = object.navigation || [];
    this.pages = object.pages || [];
  }
}
