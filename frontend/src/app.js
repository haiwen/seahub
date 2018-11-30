import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from './utils/constants';
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
import DirView from './components/dir-view/dir-view';
import MainContentWrapper from './components/main-content-wrapper';

import 'seafile-ui';
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

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      isSidePanelClosed: false,
      draftCounts: 0,
      draftList:[],
      isLoadingDraft: true,
      currentTab: 'dashboard',
    };
    this.currentTab = ''; //just for refresh brower
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

  tabItemClick = (tabName) => {
    this.setState({currentTab: tabName});
  } 

  updateCurrentTab = (tabName) => {
    this.currentTab = tabName;
  }

  render() {
    let { currentTab } = this.state;
    return (
      <div id="main">
        <SidePanel isSidePanelClosed={this.state.isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick} draftCounts={this.state.draftCounts} />

        <MainPanel>
          <Router>
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
            <MyLibraries path={siteRoot + 'my-libs/*'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            <DirView path={siteRoot + 'library/:repoID/*'} onMenuClick={this.onShowSidePanel} updateCurrentTab={this.updateCurrentTab}/>
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
