import React, { Component } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, isWiki2, wikiId } from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import WikiNav from './wiki-nav/index';
import PageUtils from './wiki-nav/page-utils';
import { isObjectNotEmpty } from './utils';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import WikiExternalOperations from './wiki-external-operations';

import './side-panel.css';

const { repoName } = window.wiki.config;

const propTypes = {
  closeSideBar: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  config: PropTypes.object.isRequired,
  saveWikiConfig: PropTypes.func.isRequired,
  updateWikiConfig: PropTypes.func.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  currentPageId: PropTypes.string,
  onUpdatePage: PropTypes.func.isRequired,
};

class SidePanel extends Component {

  constructor(props) {
    super(props);
  }

  confirmDeletePage = (pageId) => {
    const config = deepCopy(this.props.config);
    // const index = PageUtils.getPageIndexById(pageId, pages);
    // config.pages.splice(index, 1);
    // PageUtils.deletePage(navigation, pageId);
    // this.props.saveWikiConfig(config);
    // TODO: To delete a page, do you need to delete all subpages at once (requires a new API)
    wikiAPI.deleteWiki2Page(wikiId, pageId).then(res=>{
      const newConfig = JSON.parse(res.data.wiki_config);
      this.props.updateWikiConfig(newConfig);
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

  addPageInside = async ({ newConfig }) => {
    this.props.updateWikiConfig(newConfig);
  };

  onAddNewPage = async ({ page_id, newConfig, successCallback, jumpToNewPage = true }) => {
    this.props.updateWikiConfig(newConfig);
    jumpToNewPage && this.props.setCurrentPage(page_id, successCallback);
    successCallback();
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
    const onSuccess = () => {
      jumpToNewPage && this.props.setCurrentPage(pageId, successCallback);
      successCallback();
    };
    this.props.saveWikiConfig(config, onSuccess, errorCallback);
  };

  movePage = ({ moved_page_id, target_page_id, move_position }) => {
    let config = deepCopy(this.props.config);
    let { navigation } = config;
    PageUtils.movePage(navigation, moved_page_id, target_page_id, move_position);
    config.navigation = navigation;
    this.props.saveWikiConfig(config);
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
      const { page_id } = res.data.file_info;
      const newConfig = JSON.parse(res.data.wiki.wiki_config);
      this.onAddNewPage({
        page_id: page_id,
        name: pageName,
        newConfig: newConfig,
        successCallback: voidFn(),
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.onError();
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
          {isLoading ? <Loading /> : this.renderWikiNav()}
        </div>
        <WikiExternalOperations onAddWikiPage={this.handleAddNewPage.bind(false)} />
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
