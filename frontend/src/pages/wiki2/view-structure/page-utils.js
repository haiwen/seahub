const FOLDER = 'folder';
const PAGE = 'page';

export default class PageUtils {

  static getPageById = (pages, page_id) => {
    if (!page_id || !Array.isArray(pages)) return null;
    return pages.find((page) => page.id === page_id) || null;
  };

  static getPageFromNavigationById = (navigation, page_id) => {
    if (!page_id || !Array.isArray(navigation)) return null;
    let page_index = navigation.indexOf(item => item.id === page_id);
    if (page_index > -1) {
      return navigation[page_index];
    }
    for (let i = 0; i < navigation.length; i++) {
      const currNavigation = navigation[i];
      if (currNavigation.id === page_id) {
        return currNavigation;
      }

      if (Array.isArray(currNavigation.children)) {
        for (let j = 0; j < currNavigation.children.length; j++) {
          if (currNavigation.children[j].id === page_id) {
            return currNavigation.children[j];
          }
        }
      }
    }
    return null;
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

  static addPage(navigation, page_id, target_folder_id) {
    // 1. Add pages directly under the root directory
    if (!target_folder_id) {
      navigation.push({ id: page_id, type: PAGE });
      return;
    } else {
      // 2. Add pages to the folder
      navigation.forEach(item => {
        if (item.type === FOLDER) {
          this._addPageInFolder(page_id, item, target_folder_id);
        }
      });
    }
  }

  static _addPageInFolder(page_id, folder, target_folder_id) {
    if (folder.id === target_folder_id) {
      folder.children.push({ id: page_id, type: PAGE });
      return true;
    }
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._addPageInFolder(page_id, item, target_folder_id);
      }
    });
  }

  static insertPage(navigation, page_id, target_page_id, folder_id, move_position) {
    // 1. No folder, insert page in root directory
    if (!folder_id) {
      let insertIndex = target_page_id ? navigation.findIndex(item => item.id === target_page_id) : -1;
      if (insertIndex < 0) {
        this.addPage(navigation, page_id, folder_id);
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
        this._insertPageIntoFolder(item, page_id, target_page_id, folder_id, move_position);
      }
    });
  }

  static _insertPageIntoFolder(folder, page_id, target_page_id, folder_id, move_position) {
    if (folder.id === folder_id) {
      let insertIndex = target_page_id ? folder.children.findIndex(item => item.id === target_page_id) : -1;
      if (move_position === 'move_below') {
        insertIndex++;
      }
      folder.children.splice(insertIndex, 0, { id: page_id, type: PAGE });
      return;
    }
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._insertPageIntoFolder(item, page_id, target_page_id, folder_id, move_position);
      }
    });
  }

  // Move the page to the top or bottom of the folder
  static insertPageOut(navigation, page_id, folder_id, move_position) {
    let indexOffset = 0;
    if (move_position === 'move_below') {
      indexOffset++;
    }
    let page = { id: page_id, type: PAGE };
    let folder_index = this.getFolderIndexById(navigation, folder_id);
    if (folder_index > -1) {
      navigation.splice(folder_index + indexOffset, 0, page);
    } else {
      navigation.forEach((item) => {
        if (item.type === FOLDER) {
          let folder_index = this.getFolderIndexById(item.children, folder_id);
          if (folder_index > -1) {
            item.children.splice(folder_index + indexOffset, 0, page);
          }
        }
      });
    }
  }

  static deletePage(navigation, page_id) {
    // 1. Delete pages directly under the root directory
    const pageIndex = navigation.findIndex(item => item.id === page_id);
    if (pageIndex > -1) {
      navigation.splice(pageIndex, 1);
      return true;
    }
    // 2. Delete Page in Folder
    navigation.forEach(item => {
      if (item.type === FOLDER) {
        this._deletePageInFolder(item, page_id);
      }
    });
  }

  static _deletePageInFolder(folder, page_id) {
    let pageIndex = folder.children.findIndex(item => item.id === page_id);
    if (pageIndex > -1) {
      folder.children.splice(pageIndex, 1);
      return true;
    }
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._deletePageInFolder(item, page_id);
      }
    });
  }

  // movePageintoFolder
  static movePage(navigation, moved_page_id, target_page_id, source_folder_id, target_folder_id, move_position) {
    this.deletePage(navigation, moved_page_id, source_folder_id);
    this.insertPage(navigation, moved_page_id, target_page_id, target_folder_id, move_position);
  }

  // movePageOutsideFolder
  static movePageOut(navigation, moved_page_id, source_folder_id, target_folder_id, move_position) {
    this.deletePage(navigation, moved_page_id, source_folder_id);
    this.insertPageOut(navigation, moved_page_id, target_folder_id, move_position);
  }
}
