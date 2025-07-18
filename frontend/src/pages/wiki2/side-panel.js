import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import classNames from 'classnames';
import { wikiId, wikiPermission, gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import WikiNav from './wiki-nav/index';
import PageUtils from './wiki-nav/page-utils';
import Page from './models/page';
import { isObjectNotEmpty, isPageInSubtree } from './utils';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import WikiExternalOperations from './wiki-external-operations';
import WikiTrashDialog from './wiki-trash-dialog';
import { DEFAULT_PAGE_NAME } from './constant';
import Wiki2Search from '../../components/search/wiki2-search';
import CommonUndoTool from '../../components/common/common-undo-tool';
import PublishedWikiExtrance from '../../components/published-wiki-entrance';
import { userAPI } from '../../utils/user-api';
import ImportWikiPageDialog from '../../components/dialog/import-wiki-page-dialog';
import './side-panel.css';

const { repoName, publishUrl } = window.wiki.config;

const propTypes = {
  isSidePanelOpen: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  config: PropTypes.object.isRequired,
  updateWikiConfig: PropTypes.func.isRequired,
  getWikiConfig: PropTypes.func.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  getCurrentPageId: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
  style: PropTypes.object.isRequired,
};

class SidePanel extends PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      isShowTrashDialog: false,
      customUrl: publishUrl
    };
  }

  onDeletePage = (pageId) => {
    const config = deepCopy(this.props.config);
    const { pages, navigation } = config;
    const index = PageUtils.getPageIndexById(pageId, pages);
    const deletePageName = pages[index].name;
    config.pages.splice(index, 1);
    wikiAPI.deleteWiki2Page(wikiId, pageId).then((res) => {
      if (res.data.success === true) {
        this.props.updateWikiConfig(config);
        toaster.success(
          <span>
            {gettext('Page {name_placeholder} deleted.').replace('{name_placeholder}', deletePageName)}
            <CommonUndoTool onUndoOperation={() => this.revertWikiPage(pageId)} />
          </span>
        );
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    const currentPageId = this.props.getCurrentPageId();
    if (currentPageId === pageId || isPageInSubtree(navigation, pageId, currentPageId)) {
      const newPageId = config.pages.length > 0 ? config.pages[0].id : '';
      this.props.setCurrentPage(newPageId);
    }
  };

  revertWikiPage = (pageId) => {
    wikiAPI.revertTrashPage(wikiId, pageId).then(res => {
      if (res.data.success === true) {
        this.props.getWikiConfig();
        toaster.closeAll();
        toaster.success(gettext('Restored 1 item'));
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  addPageInside = async ({ parentPageId, page_id, name, icon, path, docUuid, successCallback, errorCallback }) => {
    const newPage = new Page({ id: page_id, name, icon, path, docUuid });
    this.addPage(newPage, parentPageId, successCallback, errorCallback);
  };

  onAddNewPage = async ({ name, icon, path, page_id, docUuid, successCallback, errorCallback, jumpToNewPage = true }) => {
    const newPage = new Page({ id: page_id, name, icon, path, docUuid });
    this.addPage(newPage, '', successCallback, errorCallback, jumpToNewPage);
  };

  duplicatePage = async (fromPageConfig, successCallback, errorCallback) => {
    const { from_page_id } = fromPageConfig;
    wikiAPI.duplicateWiki2Page(wikiId, from_page_id).then(res => {
      const newConfig = JSON.parse(res.data.wiki_config);
      this.props.updateWikiConfig(newConfig);
      successCallback && successCallback();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      errorCallback && errorCallback();
    });
  };

  queryImportPageStatus = (task_id, task_type, new_page, from_page_id) => {
    userAPI.queryIOStatus(task_id, task_type).then(res => {
      if (res.data.is_finished === true) {
        toaster.success('Import page success.');
        this.setState({
          isShowImportPageDialog: false
        });
        this.addPage(new_page, from_page_id, null, null, true);
      } else {
        setTimeout(() => {
          this.queryImportPageStatus(task_id, task_type, new_page, from_page_id);
        }, 1000);
      }
    }).catch(err => {
      this.setState({
        isShowImportPageDialog: false
      });
      toaster.danger(gettext('Failed to import page. '));
    });
  };

  importPage = async (fromPageConfig, successCallback, errorCallback, jumpToNewPage = true) => {
    const { from_page_id, file } = fromPageConfig;
    let newPage;
    let task_id = '';
    this.setState({
      isShowImportPageDialog: true
    });
    wikiAPI.importWiki2Page(wikiId, from_page_id, file).then(res => {
      const { page_id, name, path, docUuid } = res.data;
      task_id = res.data.task_id;
      newPage = new Page({ id: page_id, name, icon: '', path, docUuid });
      this.setState({
        taskId: task_id
      });
      return userAPI.queryIOStatus(task_id, 'import');
    }).then(res => {
      if (res.data.is_finished === true) {
        this.setState({
          isShowImportPageDialog: false
        });
        this.addPage(newPage, from_page_id, successCallback, errorCallback, jumpToNewPage);
      } else {
        this.queryImportPageStatus(task_id, 'import', newPage, from_page_id);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      errorCallback && errorCallback();
    });
  };

  addPage = (page, parent_id, successCallback, errorCallback, jumpToNewPage = true) => {
    const { config } = this.props;
    const navigation = config.navigation;
    const page_id = page.id;
    config.pages.push(page);
    PageUtils.addPage({ navigation, page_id, parent_id });
    config.navigation = navigation;
    JSON.stringify(config);
    this.props.updateWikiConfig(config);
    jumpToNewPage && this.props.setCurrentPage(page_id, successCallback);
    successCallback && successCallback();
  };

  movePage = ({ moved_page_id, target_page_id, move_position }) => {
    let config = deepCopy(this.props.config);
    let { navigation } = config;
    config.navigation = PageUtils.movePage(navigation, moved_page_id, target_page_id, move_position);
    JSON.stringify(config);
    this.props.updateWikiConfig(config);
  };

  addSiblingPage = (page, parent_id, insert_position, sibling_page_id, successCallback) => {
    const { config } = this.props;
    const navigation = config.navigation;
    const page_id = page.page_id;
    config.pages.push(page);
    PageUtils.addPage({ navigation, page_id, parent_id, insert_position, sibling_page_id });
    config.navigation = navigation;
    JSON.stringify(config);
    this.props.updateWikiConfig(config);
    this.props.setCurrentPage(page_id, successCallback);
    successCallback && successCallback();
  };

  toggleTrashDialog = () => {
    this.setState({ isShowTrashDialog: !this.state.isShowTrashDialog });
  };

  toggleImportPageDialog = () => {
    this.setState({ isShowImportPageDialog: !this.state.isShowImportPageDialog });
  };

  renderWikiNav = () => {
    const { config, onUpdatePage } = this.props;
    const { pages, navigation } = config;
    return (
      <div className="wiki2-pages-container">
        {isObjectNotEmpty(config) &&
          <WikiNav
            navigation={navigation}
            pages={pages}
            onDeletePage={this.onDeletePage}
            onUpdatePage={onUpdatePage}
            setCurrentPage={this.props.setCurrentPage}
            onMovePage={this.movePage}
            updateWikiConfig={this.props.updateWikiConfig}
            onAddNewPage={this.onAddNewPage}
            duplicatePage={this.duplicatePage}
            importPage={this.importPage}
            getCurrentPageId={this.props.getCurrentPageId}
            addPageInside={this.addPageInside}
            toggleTrashDialog={this.toggleTrashDialog}
            addSiblingPage={this.addSiblingPage}
            handleAddNewPage={this.handleAddNewPage}
          />
        }
      </div>
    );
  };

  // default page name
  handleAddNewPage = (jumpToNewPage = true, pageName = gettext(DEFAULT_PAGE_NAME)) => {
    if (this.isAddingPage === true) return;
    this.isAddingPage = true;
    wikiAPI.createWiki2Page(wikiId, pageName).then(res => {
      this.isAddingPage = false;
      const { page_id, obj_name, doc_uuid, parent_dir, page_name } = res.data.file_info;
      this.onAddNewPage({
        page_id: page_id,
        name: page_name,
        icon: '',
        path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
        docUuid: doc_uuid,
        successCallback: () => {},
        errorCallback: () => {},
        jumpToNewPage,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.isAddingPage = false;
    });
  };

  onAddWikiPage = (jumpToNewPage = true, pageName = gettext(DEFAULT_PAGE_NAME), insert_position) => {
    if (this.isAddingPage === true) return;
    this.isAddingPage = true;
    const currentPageId = this.props.getCurrentPageId();
    wikiAPI.createWiki2Page(wikiId, pageName, currentPageId, insert_position).then(res => {
      this.isAddingPage = false;
      const { page_id, obj_name, doc_uuid, parent_dir, page_name } = res.data.file_info;
      this.addPageInside({
        parentPageId: currentPageId,
        page_id: page_id,
        name: page_name,
        icon: '',
        path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
        docUuid: doc_uuid,
        successCallback: () => {},
        errorCallback: () => {},
        jumpToNewPage,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.isAddingPage = false;
    });
  };

  render() {
    const { isLoading, config, style } = this.props;
    return (
      <div className={classNames('wiki2-side-panel', { 'left-zero': this.props.isSidePanelOpen })} style={style}>
        <div className="wiki2-side-panel-top">
          <h1 className="h4 text-truncate ml-0 mb-0" title={repoName}>{repoName}</h1>
          {(wikiPermission === 'rw' && this.state.customUrl) &&
            <PublishedWikiExtrance wikiID={wikiId} customURLPart={this.state.customUrl} />
          }
        </div>
        <Wiki2Search
          wikiId={wikiId}
          config={config}
          getCurrentPageId={this.props.getCurrentPageId}
          setCurrentPage={this.props.setCurrentPage}
        />
        <div className="wiki2-side-nav">
          {isLoading ? <Loading/> : this.renderWikiNav()}
        </div>
        {this.state.isShowTrashDialog && (
          <WikiTrashDialog
            showTrashDialog={this.state.isShowTrashDialog}
            toggleTrashDialog={this.toggleTrashDialog}
            getWikiConfig={this.props.getWikiConfig}
          />
        )}
        {this.state.isShowImportPageDialog && (
          <ImportWikiPageDialog
            toggleDialog={this.toggleImportPageDialog}
          />
        )}
        {wikiPermission === 'rw' &&
          <WikiExternalOperations onAddWikiPage={this.onAddWikiPage.bind(false)} />
        }
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
