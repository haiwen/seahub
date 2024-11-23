import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import classNames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, isWiki2, wikiId, wikiPermission } from '../../utils/constants';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import WikiNav from './wiki-nav/index';
import PageUtils from './wiki-nav/page-utils';
import Page from './models/page';
import { isObjectNotEmpty } from './utils';
import wikiAPI from '../../utils/wiki-api';
import { Utils } from '../../utils/utils';
import WikiExternalOperations from './wiki-external-operations';
import WikiTrashDialog from './wiki-trash-dialog';
import { DEFAULT_PAGE_NAME } from './constant';
import Wiki2Search from '../../components/search/wiki2-search';

import './side-panel.css';

const { repoName } = window.wiki.config;

const propTypes = {
  isSidePanelOpen: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  config: PropTypes.object.isRequired,
  updateWikiConfig: PropTypes.func.isRequired,
  getWikiConfig: PropTypes.func.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  getCurrentPageId: PropTypes.func.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

class SidePanel extends PureComponent {

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
    if (this.props.getCurrentPageId() === pageId) {
      const newPageId = config.pages.length > 0 ? config.pages[0].id : '';
      this.props.setCurrentPage(newPageId);
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

  toggleTrashDialog = () => {
    this.setState({ isShowTrashDialog: !this.state.isShowTrashDialog });
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
            getCurrentPageId={this.props.getCurrentPageId}
            addPageInside={this.addPageInside}
            toggleTrashDialog={this.toggleTrashDialog}
          />
        }
      </div>
    );
  };

  // default page name
  handleAddNewPage = (jumpToNewPage = true, pageName = DEFAULT_PAGE_NAME) => {
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

  render() {
    const { isLoading, config } = this.props;
    const isDesktop = Utils.isDesktop();
    return (
      <div className={classNames('wiki2-side-panel', { 'left-zero': this.props.isSidePanelOpen })}>
        <div className="wiki2-side-panel-top">
          <h4 className="text-truncate ml-0 mb-0" title={repoName}>{repoName}</h4>
          {isDesktop && wikiPermission !== 'public' &&
            <div>
              <i
                id='wiki-add-new-page'
                onClick={this.handleAddNewPage.bind(true)}
                className='sf3-font sf3-font-new-page add-new-page p-1'
              >
              </i>
              <UncontrolledTooltip className='wiki-new-page-tooltip' target="wiki-add-new-page">
                {gettext('New page')}
              </UncontrolledTooltip>
            </div>
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
        <WikiExternalOperations onAddWikiPage={this.handleAddNewPage.bind(false)}/>
        {this.state.isShowTrashDialog && (
          <WikiTrashDialog
            showTrashDialog={this.state.isShowTrashDialog}
            toggleTrashDialog={this.toggleTrashDialog}
            getWikiConfig={this.props.getWikiConfig}
          />
        )}
        {wikiPermission !== 'public' &&
          <WikiExternalOperations onAddWikiPage={this.handleAddNewPage.bind(false)} />
        }
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
