import { FOLDER, PAGE } from '../constant';

export default class PageUtils {

  static addPage(navigation, page_id, parentId) {
    if (!parentId) {
      navigation.push({ id: page_id, type: PAGE });
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
      item.children.push({ id: page_id, type: PAGE });
      return true;
    }
    item.children.forEach(item => {
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
    item.children.forEach(item => {
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

  static getFolderById = (list, folder_id) => {
    if (!folder_id || !Array.isArray(list)) return null;
    return list.find(item => item.type === FOLDER && item.id === folder_id);
  };

  static getFolderIndexById = (list, folder_id) => {
    if (!folder_id || !Array.isArray(list)) return -1;
    return list.findIndex(folder => folder.id === folder_id);
  };

  static modifyFolder(navigation, folder_id, folder_data) {
    navigation.forEach(item => {
      if (item.type === FOLDER) {
        this._modifyFolder(item, folder_id, folder_data);
      }
    });
  }

  static _modifyFolder(folder, folder_id, folder_data) {
    if (folder.id === folder_id) {
      for (let key in folder_data) {
        folder[key] = folder_data[key];
      }
      return;
    }
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._modifyFolder(item, folder_id, folder_data);
      }
    });
  }

  static deleteFolder(navigation, pages, folder_id) {
    // delete folder and pages within it
    const folderIndex = this.getFolderIndexById(navigation, folder_id);
    if (folderIndex > -1) {
      this._deletePagesInFolder(pages, navigation[folderIndex]);
      navigation.splice(folderIndex, 1);
      return true;
    }

    // delete subfolder and pages within it
    navigation.forEach(item => {
      if (item.type === FOLDER) {
        const folderIndex = this.getFolderIndexById(item.children, folder_id);
        if (folderIndex > -1) {
          const subfolder = item.children[folderIndex];
          this._deletePagesInFolder(pages, subfolder);
          item.children.splice(folderIndex, 1);
          return true;
        }
      }
    });
    return false;
  }

  static _deletePagesInFolder(pages, folder) {
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._deletePagesInFolder(pages, item);
      }
      if (item.type === PAGE) {
        let index = this.getPageIndexById(item.id, pages);
        pages.splice(index, 1);
      }
    });
  }

  static insertPage(navigation, page_id, target_page_id, target_id, move_position) {
    // 1. No folder, insert page in root directory
    if (!target_id) {
      let insertIndex = target_page_id ? navigation.findIndex(item => item.id === target_page_id) : -1;
      if (insertIndex < 0) {
        this.addPage(navigation, page_id, target_id);
        return true;
      }
      if (move_position === 'move_below') {
        insertIndex++;
      }
      navigation.splice(insertIndex, 0, { id: page_id, type: PAGE });
      return;
    }
    // 2. If there is a folder, find it and insert it
    navigation.forEach(item => {
      if (item.type === FOLDER) {
        this._insertPageIntoFolder(item, page_id, target_page_id, target_id, move_position);
      }
    });
  }

  static _insertPageIntoFolder(folder, page_id, target_page_id, target_id, move_position) {
    if (folder.id === target_id) {
      let insertIndex = target_page_id ? folder.children.findIndex(item => item.id === target_page_id) : -1;
      if (move_position === 'move_below') {
        insertIndex++;
      }
      folder.children.splice(insertIndex, 0, { id: page_id, type: PAGE });
      return;
    }
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._insertPageIntoFolder(item, page_id, target_page_id, target_id, move_position);
      }
    });
  }

  // Move the page to the top or bottom of the folder
  static insertPageOut(navigation, page_id, target_id, move_position) {
    let indexOffset = 0;
    if (move_position === 'move_below') {
      indexOffset++;
    }
    let page = { id: page_id, type: PAGE };
    let folder_index = this.getFolderIndexById(navigation, target_id);
    if (folder_index > -1) {
      navigation.splice(folder_index + indexOffset, 0, page);
    } else {
      navigation.forEach((item) => {
        if (item.type === FOLDER) {
          let folder_index = this.getFolderIndexById(item.children, target_id);
          if (folder_index > -1) {
            item.children.splice(folder_index + indexOffset, 0, page);
          }
        }
      });
    }
  }

  // movePageintoFolder
  static movePage(navigation, moved_page_id, target_page_id, source_id, target_id, move_position) {
    this.deletePage(navigation, moved_page_id, source_id);
    this.insertPage(navigation, moved_page_id, target_page_id, target_id, move_position);
  }

  // movePageOutsideFolder
  static movePageOut(navigation, moved_page_id, source_id, target_id, move_position) {
    this.deletePage(navigation, moved_page_id, source_id);
    this.insertPageOut(navigation, moved_page_id, target_id, move_position);
  }
}
