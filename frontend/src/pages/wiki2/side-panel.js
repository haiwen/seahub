import React, { Component } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import { gettext, isWiki2, wikiId } from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import ViewStructure from './view-structure';
import PageUtils from './view-structure/page-utils';
import NewFolderDialog from './view-structure/new-folder-dialog';
import AddNewPageDialog from './view-structure/add-new-page-dialog';
import ViewStructureFooter from './view-structure/view-structure-footer';
import { generateUniqueId, isObjectNotEmpty } from './utils';
import Folder from './models/folder';
import Page from './models/page';
import wikiAPI from '../../utils/wiki-api';
import { FOLDER } from './constant';

import './side-panel.css';
import { Utils } from '../../utils/utils';
import { Tooltip, UncontrolledTooltip } from 'reactstrap';

const { repoName } = window.wiki.config;

const propTypes = {
  closeSideBar: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  config: PropTypes.object.isRequired,
  saveWikiConfig: PropTypes.func.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  currentPageId: PropTypes.string,
};

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowNewFolderDialog: false,
      isShowAddNewPageDialog: false,
    };
  }

  confirmDeletePage = (pageId) => {
    const config = deepCopy(this.props.config);
    const { pages, navigation } = config;
    const index = PageUtils.getPageIndexById(pageId, pages);
    config.pages.splice(index, 1);
    PageUtils.deletePage(navigation, pageId);
    this.props.saveWikiConfig(config);
    wikiAPI.deleteWiki2Page(wikiId, pageId);
    if (config.pages.length > 0) {
      this.props.setCurrentPage(config.pages[0].id);
    } else {
      this.props.setCurrentPage('');
    }
  };

  onAddNewPage = async ({ name, icon, path, docUuid, successCallback, errorCallback }) => {
    const { config } = this.props;
    const navigation = config.navigation;
    const pageId = generateUniqueId(navigation);
    const newPage = new Page({ id: pageId, name, icon, path, docUuid });
    this.addPage(newPage, successCallback, errorCallback);
  };

  duplicatePage = async (fromPageConfig, successCallback, errorCallback) => {
    const { config } = this.props;
    const { name, from_page_id } = fromPageConfig;
    const { navigation, pages } = config;
    const fromPage = PageUtils.getPageById(pages, from_page_id);
    const newPageId = generateUniqueId(navigation);
    let newPageConfig = {
      ...fromPage,
      id: newPageId,
      name,
    };
    const newPage = new Page({ ...newPageConfig });
    this.addPage(newPage, successCallback, errorCallback);
  };

  addPage = (page, successCallback, errorCallback) => {
    const { config } = this.props;
    const navigation = config.navigation;
    const pageId = page.id;
    config.pages.push(page);
    PageUtils.addPage(navigation, pageId, this.current_folder_id);
    config.navigation = navigation;
    const onSuccess = () => {
      this.props.setCurrentPage(pageId, successCallback);
      successCallback();
    };
    this.props.saveWikiConfig(config, onSuccess, errorCallback);
  };

  onUpdatePage = (pageId, newPage) => {
    if (newPage.name === '') {
      toaster.danger(gettext('Page name cannot be empty'));
      return;
    }
    const { config } = this.props;
    let pages = config.pages;
    let currentPage = pages.find(page => page.id === pageId);
    Object.assign(currentPage, newPage);
    config.pages = pages;
    this.props.saveWikiConfig(config);
  };

  movePage = ({ moved_view_id, target_view_id, source_view_folder_id, target_view_folder_id, move_position }) => {
    let config = deepCopy(this.props.config);
    let { navigation } = config;
    PageUtils.movePage(navigation, moved_view_id, target_view_id, source_view_folder_id, target_view_folder_id, move_position);
    config.navigation = navigation;
    this.props.saveWikiConfig(config);
  };

  movePageOut = (moved_page_id, source_folder_id, target_folder_id, move_position) => {
    let config = deepCopy(this.props.config);
    let { navigation } = config;
    PageUtils.movePageOut(navigation, moved_page_id, source_folder_id, target_folder_id, move_position);
    config.navigation = navigation;
    this.props.saveWikiConfig(config);
  };

  // Create a new folder in the root directory (not supported to create a new subfolder in the folder)
  addPageFolder = (folder_data, parent_folder_id) => {
    const { config } = this.props;
    const { navigation } = config;
    let folder_id = generateUniqueId(navigation);
    let newFolder = new Folder({ id: folder_id, ...folder_data });
    // No parent folder, directly add to the root directory
    if (!parent_folder_id) {
      config.navigation.push(newFolder);
    } else { // Recursively find the parent folder and add
      navigation.forEach(item => {
        if (item.type === FOLDER) {
          this._addFolder(item, newFolder, parent_folder_id);
        }
      });
    }
    this.props.saveWikiConfig(config);
  };

  _addFolder(folder, newFolder, parent_folder_id) {
    if (folder.id === parent_folder_id) {
      folder.children.push(newFolder);
      return;
    }
    folder.children.forEach(item => {
      if (item.type === FOLDER) {
        this._addFolder(item, newFolder, parent_folder_id);
      }
    });
  }

  onModifyFolder = (folder_id, folder_data) => {
    const { config } = this.props;
    const { navigation } = config;
    PageUtils.modifyFolder(navigation, folder_id, folder_data);
    config.navigation = navigation;
    this.props.saveWikiConfig(config);
  };

  onDeleteFolder = (page_folder_id) => {
    const { config } = this.props;
    const { navigation, pages } = config;
    PageUtils.deleteFolder(navigation, pages, page_folder_id);
    config.navigation = navigation;
    this.props.saveWikiConfig(config);
  };

  // Drag a folder to the front and back of another folder
  onMoveFolder = (moved_folder_id, target_folder_id, move_position) => {
    const { config } = this.props;
    const { navigation } = config;
    let updatedNavigation = deepCopy(navigation);

    // Get the moved folder first and delete the original location
    let moved_folder;
    let moved_folder_index = PageUtils.getFolderIndexById(updatedNavigation, moved_folder_id);
    if (moved_folder_index === -1) {
      updatedNavigation.forEach(item => {
        if (item.type === FOLDER) {
          moved_folder_index = PageUtils.getFolderIndexById(item.children, moved_folder_id);
          if (moved_folder_index > -1) {
            moved_folder = item.children[moved_folder_index];
            item.children.splice(moved_folder_index, 1);
          }
        }
      });
    } else {
      moved_folder = updatedNavigation[moved_folder_index];
      updatedNavigation.splice(moved_folder_index, 1);
    }
    let indexOffset = 0;
    if (move_position === 'move_below') {
      indexOffset++;
    }
    // Get the location of the release
    let target_folder_index = PageUtils.getFolderIndexById(updatedNavigation, target_folder_id);
    if (target_folder_index === -1) {
      updatedNavigation.forEach(item => {
        if (item.type === FOLDER) {
          target_folder_index = PageUtils.getFolderIndexById(item.children, target_folder_id);
          if (target_folder_index > -1) {
            item.children.splice(target_folder_index + indexOffset, 0, moved_folder);
          }
        } else {
          // not changed
          updatedNavigation = navigation;
        }
      });
    } else {
      updatedNavigation.splice(target_folder_index + indexOffset, 0, moved_folder);
    }
    config.navigation = updatedNavigation;
    this.props.saveWikiConfig(config);
  };

  // Not support yet: Move a folder into another folder
  moveFolderToFolder = (moved_folder_id, target_folder_id) => {
    let { config } = this.props;
    let { navigation } = config;

    // Find the folder and move it to this new folder
    let target_folder = PageUtils.getFolderById(navigation, target_folder_id);
    if (!target_folder) {
      toaster.danger('Only_support_two_level_folders');
      return;
    }

    let moved_folder;
    let moved_folder_index = PageUtils.getFolderIndexById(navigation, moved_folder_id);

    // The original directory is in the root directory
    if (moved_folder_index > -1) {
      moved_folder = PageUtils.getFolderById(navigation, moved_folder_id);
      // If moved folder There are other directories under the ID, and dragging is not supported
      if (moved_folder.children.some(item => item.type === FOLDER)) {
        toaster.danger('Only_support_two_level_folders');
        return;
      }
      target_folder.children.push(moved_folder);
      navigation.splice(moved_folder_index, 1);
    } else { // The original directory is not in the root directory
      navigation.forEach(item => {
        if (item.type === FOLDER) {
          let moved_folder_index = PageUtils.getFolderIndexById(item.children, moved_folder_id);
          if (moved_folder_index > -1) {
            moved_folder = item.children[moved_folder_index];
            target_folder.children.push(moved_folder);
            item.children.splice(moved_folder_index, 1);
          }
        }
      });
    }
    config.navigation = navigation;
    this.props.saveWikiConfig(config);
  };

  onToggleAddFolder = () => {
    this.setState({ isShowNewFolderDialog: !this.state.isShowNewFolderDialog });
  };

  openAddPageDialog = (folder_id) => {
    this.current_folder_id = folder_id;
    this.setState({ isShowAddNewPageDialog: true });
  };

  closeAddNewPageDialog = () => {
    this.current_folder_id = null;
    this.setState({ isShowAddNewPageDialog: false });
  };

  onSetFolderId = (folder_id) => {
    this.current_folder_id = folder_id;
  };

  renderFolderView = () => {
    const { config } = this.props;
    const { pages, navigation } = config;
    return (
      <div className="wiki2-pages-container">
        <ViewStructure
          isEditMode={isWiki2}
          navigation={navigation}
          views={pages}
          onToggleAddView={this.openAddPageDialog}
          onDeleteView={this.confirmDeletePage}
          onUpdatePage={this.onUpdatePage}
          onSelectView={this.props.setCurrentPage}
          onMoveView={this.movePage}
          movePageOut={this.movePageOut}
          onToggleAddFolder={this.onToggleAddFolder}
          onModifyFolder={this.onModifyFolder}
          onDeleteFolder={this.onDeleteFolder}
          onMoveFolder={this.onMoveFolder}
          moveFolderToFolder={this.moveFolderToFolder}
          onAddNewPage={this.onAddNewPage}
          duplicatePage={this.duplicatePage}
          onSetFolderId={this.onSetFolderId}
          currentPageId={this.props.currentPageId}
        />
        {this.state.isShowNewFolderDialog &&
          <NewFolderDialog
            onAddFolder={this.addPageFolder}
            onToggleAddFolderDialog={this.onToggleAddFolder}
          />
        }
        {this.state.isShowAddNewPageDialog &&
          <AddNewPageDialog
            toggle={this.closeAddNewPageDialog}
            onAddNewPage={this.onAddNewPage}
          />
        }
      </div>
    );
  };

  renderNoFolder = () => {
    return (
      <div className="wiki2-pages-container">
        {isWiki2 &&
          <ViewStructureFooter
            onToggleAddView={this.openAddPageDialog}
            onToggleAddFolder={this.onToggleAddFolder}
          />
        }
        {this.state.isShowNewFolderDialog &&
          <NewFolderDialog
            onAddFolder={this.addPageFolder}
            onToggleAddFolderDialog={this.onToggleAddFolder}
          />
        }
        {this.state.isShowAddNewPageDialog &&
          <AddNewPageDialog
            toggle={this.closeAddNewPageDialog}
            onAddNewPage={this.onAddNewPage}
          />
        }
      </div>
    );
  };

  handleAddNewPage = () => {
    // TODO 这里需要后端配合，创建新页面，pageName 需要后端生成
    const pageName = 'New Page';
    const voidFn = () => void 0;
    wikiAPI.createWiki2Page(wikiId, pageName).then(res => {
      const { obj_name, parent_dir, doc_uuid } = res.data;
      this.onAddNewPage({
        name: pageName,
        icon: '',
        path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
        docUuid: doc_uuid,
        successCallback: voidFn,
        errorCallback: voidFn,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.onError();
    });


    // const { config } = this.props;
    // const navigation = config.navigation;
    // const pageId = generateUniqueId(navigation);
    // const newPage = new Page({ id: pageId, name, icon, path, docUuid });
    // this.onAddNewPage(newPage, successCallback, errorCallback);
  };

  render() {
    const { isLoading, config } = this.props;
    return (
      <div className={`wiki2-side-panel${this.props.closeSideBar ? '' : ' left-zero'}`}>
        <div className="wiki2-side-panel-top">
          <h4 className="text-truncate ml-0 mb-0" title={repoName}>{repoName}</h4>
          <div id='wiki-add-new-page' className='add-new-page' onClick={this.handleAddNewPage}>
            <i className='sf3-font sf3-font-new-page'></i>
          </div>
          <UncontrolledTooltip target="wiki-add-new-page">
            {gettext('New page')}
          </UncontrolledTooltip>
        </div>
        <div className="wiki2-side-nav">
          {isLoading ? <Loading /> : (isObjectNotEmpty(config) ? this.renderFolderView() : this.renderNoFolder())}
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
