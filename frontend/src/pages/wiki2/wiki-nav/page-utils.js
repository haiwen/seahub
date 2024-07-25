class NewPage {
  constructor(id) {
    this.id = id;
    this.type = 'page';
    this.children = [];
  }
}

export default class PageUtils {

  static addPage(navigation, page_id, parentId) {
    if (!parentId) {
      navigation.push(new NewPage(page_id));
    } else {
      navigation.forEach(item => {
        this._addPageRecursion(page_id, item, parentId);
      });
    }
  }

  static _addPageRecursion(page_id, item, parentId) {
    if (!Array.isArray(item.children)) {
      item.children = [];
    }
    if (item.id === parentId) {
      item.children.push(new NewPage(page_id));
      return true;
    }
    item.children && item.children.forEach(item => {
      this._addPageRecursion(page_id, item, parentId);
    });
  }

  static deletePage(navigation, page_id) {
    const pageIndex = navigation.findIndex(item => item.id === page_id);
    if (pageIndex > -1) {
      navigation.splice(pageIndex, 1);
      return true;
    }
    navigation.forEach(item => {
      this._deletePageRecursion(item, page_id);
    });
  }

  static _deletePageRecursion(item, page_id) {
    if (!item || !Array.isArray(item.children)) return;
    let pageIndex = item.children.findIndex(item => item.id === page_id);
    if (pageIndex > -1) {
      item.children.splice(pageIndex, 1);
      return true;
    }
    item.children && item.children.forEach(item => {
      this._deletePageRecursion(item, page_id);
    });
  }

  static getPageById = (pages, page_id) => {
    if (!page_id || !Array.isArray(pages)) return null;
    return pages.find((page) => page.id === page_id) || null;
  };

  static getPageIndexById = (pageId, pages) => {
    return pages.findIndex(page => page.id === pageId);
  };

  static generatePaths = (tree) => {
    tree._path = '';
    function runNode(node) {
      const newPath = node._path ? (node._path + '-' + node.id) : (node.id || '');
      if (node.children) {
        node.children.forEach(child => {
          if (child) {
            child._path = newPath;
            runNode(child);
          }
        });
      }
    }
    runNode(tree);
  };

  /**
   * move page to another page
   * @param {object} navigation
   * @param {string} moved_page_id
   * @param {string} target_page_id
   * @param {string} move_position, one of'move_into', 'move_below', 'move_into'
   */
  static movePage(navigation, moved_page_id, target_page_id, move_position) {
    let movedPage = null;
    function _cutPageRecursion(item, page_id) {
      if (!item || !Array.isArray(item.children) || movedPage) return;
      let pageIndex = item.children.findIndex(item => item.id === page_id);
      if (pageIndex > -1) {
        movedPage = item.children.splice(pageIndex, 1)[0];
      } else {
        item.children && item.children.forEach(item => {
          _cutPageRecursion(item, page_id);
        });
      }
    }
    function _cutPage(navigation, page_id) {
      const pageIndex = navigation.findIndex(item => item.id === page_id);
      if (pageIndex > -1) {
        movedPage = navigation.splice(pageIndex, 1)[0];
      } else {
        navigation.forEach(item => {
          _cutPageRecursion(item, page_id);
        });
      }
    }
    _cutPage(navigation, moved_page_id);
    if (!movedPage) return;

    function _insertPage(tree, target_page_id, move_position) {
      if (!tree) return;
      if (!Array.isArray(tree.children)) {
        tree.children = [];
      }
      const target_page = tree.children.find(item => item.id === target_page_id);
      const target_index = tree.children.findIndex(item => item.id === target_page_id);
      if (target_page) {
        switch (move_position) {
          case 'move_into': {
            if (!Array.isArray(target_page.children)) {
              target_page.children = [];
            }
            target_page.children.push(movedPage);
            break;
          }
          case 'move_above': {
            tree.children.splice(target_index, 0, movedPage);
            break;
          }
          case 'move_below': {
            tree.children.splice(target_index + 1, 0, movedPage);
            break;
          }
          default:
            break;
        }
      } else {
        tree.children.forEach(child => {
          _insertPage(child, target_page_id, move_position);
        });
      }
    }

    let tree = {};
    tree.children = navigation;
    _insertPage(tree, target_page_id, move_position);
    this.generatePaths(tree);
    return tree.children;
  }
}
