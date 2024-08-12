import Page from './page';

export default class WikiConfig {
  constructor(object) {
    const { version = 1, pages = [], navigation = [] } = object;
    this.version = version;
    this.pages = pages.map(page => new Page(page));
    this.navigation = navigation.filter(item => {
      return item.type === 'page';
    });
    // Render pages in folder to navigation root
    const page_id_map = {};
    this.pages.forEach(page => {
      page_id_map[page.id] = false;
    });
    function traversePage(node) {
      if (!node) return;
      if (node.id) {
        page_id_map[node.id] = true;
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(child => traversePage(child));
      }
    }
    traversePage({ children: this.navigation });
  }
}
