import React, { Component, Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Router, Link } from '@reach/router';
import { gettext, siteRoot } from './utils/constants';
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import DraftsView from './pages/drafts/drafts-view';
import DraftContent from './pages/drafts/draft-content';
import ReviewContent from './pages/drafts/review-content';
import FilesActivities from './pages/dashboard/files-activities';
import Starred from './pages/starred/starred';
import LinkedDevices from './pages/linked-devices/linked-devices';
import editUtilties from './utils/editor-utilties';
import ShareAdminLibraries from './pages/share-admin/libraries';
import ShareAdminFolders from './pages/share-admin/folders';
import ShareAdminShareLinks from './pages/share-admin/share-links';
import ShareAdminUploadLinks from './pages/share-admin/upload-links';
import SharedLibraries from './pages/shared-libs/shared-libs';
import MyLibraries from './pages/my-libs/my-libs';
import MyLibDeleted from './pages/my-libs/my-libs-deleted';
import DirView from './components/dir-view/dir-view';
import Group from './pages/groups/group-view';
import Groups from './pages/groups/groups-view';
import Wikis from './pages/wikis/wikis';
import MainContentWrapper from './components/main-content-wrapper';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/toolbar.css';
import './css/search.css';

const FilesActivitiesWrapper = MainContentWrapper(FilesActivities);
const DraftsViewWrapper = MainContentWrapper(DraftsView);
const StarredWrapper = MainContentWrapper(Starred);
const LinkedDevicesWrapper = MainContentWrapper(LinkedDevices);
const SharedLibrariesWrapper = MainContentWrapper(SharedLibraries);
const ShareAdminLibrariesWrapper = MainContentWrapper(ShareAdminLibraries);
const ShareAdminFoldersWrapper = MainContentWrapper(ShareAdminFolders);
const ShareAdminShareLinksWrapper = MainContentWrapper(ShareAdminShareLinks);
const ShareAdminUploadLinksWrapper = MainContentWrapper(ShareAdminUploadLinks);
const WikisWrapper = MainContentWrapper(Wikis);

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      isSidePanelClosed: false,
      draftCounts: 0,
      draftList:[],
      isLoadingDraft: true,
      currentTab: '/',
      pathPrefix: null,
    };
  }

  componentDidMount() {
    // e.g.  from http://127.0.0.1:8000/drafts/reviews/
    // get reviews  
    // TODO: need refactor later
    let href = window.location.href.split('/');
    this.getDrafts();
    this.setState({currentTab: href[href.length - 2]});
    if (this.currentTab) {
      this.setState({currentTab: this.currentTab});
    }
  }

  getDrafts = () => {
    editUtilties.listDrafts().then(res => {
      this.setState({
        draftCounts: res.data.draft_counts,
        draftList: res.data.data, 
        isLoadingDraft: false,
      }); 
    });
  }

  updateDraftsList = (draft_id) => {
    this.setState({
      draftCounts: this.state.draftCounts - 1,
      draftList: this.state.draftList.filter(draft => draft.id != draft_id), 
    });
  }

  onCloseSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  }

  onShowSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  }

  onSearchedClick = () => {
    //todos
  }

  tabItemClick = (tabName, groupID) => {
    let pathPrefix = this.generatorPrefix(tabName, groupID);
    this.setState({
      currentTab: tabName,
      pathPrefix: pathPrefix
    });
  } 

  generatorPrefix = (currentTab, groupID) => {
    if (groupID) { //group
      return (
        <Fragment>
          <Link to={siteRoot + 'groups/'} className="normal">{gettext('Groups')}</Link>
          <span className="path-split">/</span>
          <Link to={siteRoot + 'group/' + groupID + '/'} className="normal">{currentTab}</Link>
          <span className="path-split">/</span>
        </Fragment>
      );
    }
    if (currentTab === 'my-libs') {
      return (
        <Fragment>
          <Link to={siteRoot + 'my-libs/'} className="normal">{gettext('Libraries')}</Link>
          <span className="path-split">/</span>
        </Fragment>
      );
    }
    if (currentTab === 'shared-libs') {
      return (
        <Fragment>
          <Link to={siteRoot + 'shared-libs/'} className="normal">{gettext('Shared with me')}</Link>
          <span className="path-split">/</span>
        </Fragment>
      );
    }
    return null;
  }

  render() {
    let { currentTab } = this.state;
    return (
      <div id="main">
        <SidePanel isSidePanelClosed={this.state.isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick} draftCounts={this.state.draftCounts} />
        <MainPanel>
          <Router>
            <MyLibraries path={ siteRoot } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <FilesActivitiesWrapper path={siteRoot + 'dashboard'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <DraftsViewWrapper path={siteRoot + 'drafts'}  
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick} 
              onShowSidePanel={this.onShowSidePanel} 
              onSearchedClick={this.onSearchedClick} 
            >
              <DraftContent 
                path='/' 
                getDrafts={this.getDrafts} 
                isLoadingDraft={this.state.isLoadingDraft}
                draftList={this.state.draftList}
                updateDraftsList={this.updateDraftsList}
              />
              <ReviewContent path='reviews' />
            </DraftsViewWrapper>
            <StarredWrapper path={siteRoot + 'starred'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <LinkedDevicesWrapper path={siteRoot + 'linked-devices'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <ShareAdminLibrariesWrapper path={siteRoot + 'share-admin-libs'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <ShareAdminFoldersWrapper path={siteRoot + 'share-admin-folders'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <ShareAdminShareLinksWrapper path={siteRoot + 'share-admin-share-links'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <ShareAdminUploadLinksWrapper path={siteRoot + 'share-admin-upload-links'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <SharedLibrariesWrapper path={siteRoot + 'shared-libs'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <MyLibraries path={siteRoot + 'my-libs'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <MyLibDeleted path={siteRoot + 'my-libs/deleted/'} onSearchedClick={this.onSearchedClick} />
            <DirView path={siteRoot + 'library/:repoID/*'} pathPrefix={this.state.pathPrefix} onMenuClick={this.onShowSidePanel}/>
            <Groups path={siteRoot + 'groups'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
            <Group path={siteRoot + 'group/:groupID'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
            <WikisWrapper path={siteRoot + 'wikis'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
          </Router>
        </MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('wrapper')
);
