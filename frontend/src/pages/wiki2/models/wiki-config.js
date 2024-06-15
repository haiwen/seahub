import Page from './page';
import Folder from './folder';

export default class WikiConfig {
  constructor(object) {
    this.version = object.version || 1;
    this.navigation = (Array.isArray(object.navigation) ? object.navigation : []).map(item => {
      if (item.type === 'folder') {
        return new Folder(item);
      } else if (item.type === 'page') {
        return {
          id: item.id,
          type: item.type,
          children: item.children || [],
        };
      }
      return null;
    }).filter(item => !!item);
    this.pages = Array.isArray(object.pages) ? object.pages.map(page => new Page(page)) : [];
  }
}
