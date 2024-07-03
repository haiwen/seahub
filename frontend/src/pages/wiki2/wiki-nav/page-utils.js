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

  static insertPage(navigation, page_id, target_page_id, target_id, move_position) {
    if (!target_id) {
      let insertIndex = target_page_id ? navigation.findIndex(item => item.id === target_page_id) : -1;
      if (insertIndex < 0) {
        this.addPage(navigation, page_id, target_id);
        return true;
      }
      if (move_position === 'move_below') {
        insertIndex++;
      }
      navigation.splice(insertIndex, 0, new NewPage(page_id));
      return;
    }
  }

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
    function _insertPageRecursion(item, page_id, target_page_id, target_id, move_position) {
      if (item.id === target_id) {
        let insertIndex = target_page_id ? item.children.findIndex(item => item.id === target_page_id) : -1;
        if (move_position === 'move_below') {
          insertIndex++;
        }
        item.children.splice(insertIndex, 0, movedPage);
        return;
      }
      item.children && item.children.forEach(item => {
        _insertPageRecursion(item, page_id, target_page_id, target_id, move_position);
      });
    }
    function _insertPage(navigation, page_id, target_page_id, target_id, move_position) {
      if (!target_id) {
        let insertIndex = target_page_id ? navigation.findIndex(item => item.id === target_page_id) : -1;
        if (insertIndex < 0) {
          navigation.splice(0, 0, movedPage);
          return;
        }
        if (move_position === 'move_below') {
          insertIndex++;
        }
        navigation.splice(insertIndex, 0, movedPage);
        return;
      }
      navigation.forEach(item => {
        _insertPageRecursion(item, page_id, target_page_id, target_id, move_position);
      });
    }
    _cutPage(navigation, moved_page_id);
    _insertPage(navigation, moved_page_id, target_page_id, target_page_id, move_position);
  }
}
