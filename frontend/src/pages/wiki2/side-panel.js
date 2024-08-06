import React, { Component } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, isWiki2, wikiId } from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import WikiNav from './wiki-nav/index';
import PageUtils from './wiki-nav/page-utils';
import Page from './models/page';
import { isObjectNotEmpty } from './utils';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import WikiExternalOperations from './wiki-external-operations';

import './side-panel.css';
import WikiTrashDialog from './wiki-trash-dialog';

const { repoName } = window.wiki.config;

const propTypes = {
  closeSideBar: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  config: PropTypes.object.isRequired,
  updateWikiConfig: PropTypes.func.isRequired,
  getWikiConfig: PropTypes.func.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  currentPageId: PropTypes.string,
  onUpdatePage: PropTypes.func.isRequired,
};

class SidePanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowTrashDialog: false,
    };
  }
  confirmDeletePage = (pageId) => {
    const config = deepCopy(this.props.config);
    const { pages } = config;
    const index = PageUtils.getPageIndexById(pageId, pages);
    config.pages.splice(index, 1);
    wikiAPI.deleteWiki2Page(wikiId, pageId).then((res) => {
      if (res.data.success === true) {
        this.props.updateWikiConfig(config);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    if (config.pages.length > 0) {
      this.props.setCurrentPage(config.pages[0].id);
    } else {
      this.props.setCurrentPage('');
    }
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

  addPage = (page, parentId, successCallback, errorCallback, jumpToNewPage = true) => {
    const { config } = this.props;
    const navigation = config.navigation;
    const pageId = page.id;
    config.pages.push(page);
    PageUtils.addPage(navigation, pageId, parentId);
    config.navigation = navigation;
    JSON.stringify(config);
    this.props.updateWikiConfig(config);
    jumpToNewPage && this.props.setCurrentPage(pageId, successCallback);
    successCallback && successCallback();
  };

  movePage = ({ moved_page_id, target_page_id, move_position }) => {
    let config = deepCopy(this.props.config);
    let { navigation } = config;
    config.navigation = PageUtils.movePage(navigation, moved_page_id, target_page_id, move_position);
    JSON.stringify(config);
    this.props.updateWikiConfig(config);
  };

  toggelTrashDialog = () => {
    this.setState({ 'isShowTrashDialog': !this.state.isShowTrashDialog });
  };

  renderWikiNav = () => {
    const { config, onUpdatePage } = this.props;
    const { pages, navigation } = config;
    return (
      <div className="wiki2-pages-container">
        {isObjectNotEmpty(config) &&
          <WikiNav
            isEditMode={isWiki2}
            navigation={navigation}
            pages={pages}
            onDeletePage={this.confirmDeletePage}
            onUpdatePage={onUpdatePage}
            setCurrentPage={this.props.setCurrentPage}
            onMovePage={this.movePage}
            updateWikiConfig={this.props.updateWikiConfig}
            onAddNewPage={this.onAddNewPage}
            duplicatePage={this.duplicatePage}
            currentPageId={this.props.currentPageId}
            addPageInside={this.addPageInside}
          />
        }
      </div>
    );
  };

  // default page name
  handleAddNewPage = (jumpToNewPage = true, pageName = 'Untitled') => {
    const voidFn = () => void 0;
    wikiAPI.createWiki2Page(wikiId, pageName).then(res => {
      const { page_id, obj_name, doc_uuid, parent_dir, page_name } = res.data.file_info;
      this.onAddNewPage({
        page_id: page_id,
        name: page_name,
        icon: '',
        path: parent_dir === '/' ? `/${obj_name}` : `${parent_dir}/${obj_name}`,
        docUuid: doc_uuid,
        successCallback: voidFn,
        errorCallback: voidFn,
        jumpToNewPage,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { isLoading } = this.props;
    return (
      <div className={`wiki2-side-panel${this.props.closeSideBar ? '' : ' left-zero'}`}>
        <div className="wiki2-side-panel-top">
          <h4 className="text-truncate ml-0 mb-0" title={repoName}>{repoName}</h4>
          <div id='wiki-add-new-page' className='add-new-page' onClick={this.handleAddNewPage.bind(true)}>
            <i className='sf3-font sf3-font-new-page'></i>
          </div>
          <UncontrolledTooltip className='wiki-new-page-tooltip' target="wiki-add-new-page">
            {gettext('New page')}
          </UncontrolledTooltip>
        </div>
        <div className="wiki2-side-nav">
          {isLoading ? <Loading/> : this.renderWikiNav()}
        </div>
        <WikiExternalOperations onAddWikiPage={this.handleAddNewPage.bind(false)}/>
        {this.state.isShowTrashDialog && (
          <WikiTrashDialog
            showTrashDialog={this.state.isShowTrashDialog}
            toggleTrashDialog={this.toggelTrashDialog}
            getWikiConfig={this.props.getWikiConfig}
          />
        )}
        <a className={'wiki2-trash'} onClick={this.toggelTrashDialog}> Trash </a>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
