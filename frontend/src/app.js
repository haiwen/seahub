import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Router, navigate } from '@reach/router';
import { siteRoot, canAddRepo } from './utils/constants';
import { Utils } from './utils/utils';
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
import PublicSharedView from './pages/shared-with-all/public-shared-view';
import LibContentView from './pages/lib-content-view/lib-content-view';
import Group from './pages/groups/group-view';
import Groups from './pages/groups/groups-view';
import Wikis from './pages/wikis/wikis';
import MainContentWrapper from './components/main-content-wrapper';

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
      currentTab: '/',
      pathPrefix: [],
    };
    this.dirViewPanels = ['my-libs', 'shared-libs', 'org']; // and group
  }

  componentDidMount() {
    // e.g.  from http://127.0.0.1:8000/drafts/reviews/
    // get reviews  
    // TODO: need refactor later
    let href = window.location.href.split('/');
    this.getDrafts();
    this.setState({currentTab: href[href.length - 2]});
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

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      this.setState({currentTab: '', pathPrefix: []});
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, {repalce: true});
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  onGroupChanged = (groupID) => {
    setTimeout(function(){
      let url;
      if (groupID) {
        url = siteRoot + 'group/' + groupID + '/';
      }
      else {
        url = siteRoot + 'groups/';
      }
      window.location = url.toString();
    }, 1);
  }

  tabItemClick = (tabName, groupID) => {
    let pathPrefix = [];
    if (groupID || this.dirViewPanels.indexOf(tabName) > -1) {
      pathPrefix = this.generatorPrefix(tabName, groupID);
    }
    this.setState({
      currentTab: tabName,
      pathPrefix: pathPrefix
    });
  } 

  generatorPrefix = (tabName, groupID) => {
    let pathPrefix = [];
    if (groupID) {
      let navTab1 = {
        url: siteRoot + 'groups/',
        showName: 'Groups',
        name: 'groups',
        id: null,
      };
      let navTab2 = {
        url: siteRoot + 'group/' + groupID + '/',
        showName: tabName,
        name: tabName,
        id: groupID,
      };
      pathPrefix.push(navTab1);
      pathPrefix.push(navTab2);
    } else {
      let navTab = {
        url: siteRoot + tabName + '/',
        showName: this.getTabShowName(tabName),
        name: tabName,
        id: null,
      };
      pathPrefix.push(navTab);
    }
    return pathPrefix;
  }

  getTabShowName = (tabName) => {
    if (tabName === 'my-libs') {
      return 'Libraries';
    }
    if (tabName === 'shared-libs') {
      return 'Shared with me';
    }
    if (tabName === 'org') {
      return 'Shared with all';
    }
  }

  render() {
    let { currentTab } = this.state;

    const home = canAddRepo ?
      <MyLibraries path={ siteRoot } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} /> :
      <SharedLibrariesWrapper path={ siteRoot } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />;

    return (
      <div id="main">
        <SidePanel isSidePanelClosed={this.state.isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick} draftCounts={this.state.draftCounts} />
        <MainPanel>
          <Router>
            {home}
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
            <LibContentView path={siteRoot + 'library/:repoID/*'} pathPrefix={this.state.pathPrefix} onMenuClick={this.onShowSidePanel} onTabNavClick={this.tabItemClick}/>
            <Groups path={siteRoot + 'groups'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
            <Group
              path={siteRoot + 'group/:groupID'}
              onShowSidePanel={this.onShowSidePanel}
              onSearchedClick={this.onSearchedClick}
              onTabNavClick={this.tabItemClick}
              onGroupChanged={this.onGroupChanged}
            />
            <Wikis path={siteRoot + 'wikis'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
            <PublicSharedView path={siteRoot + 'org/'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} onTabNavClick={this.tabItemClick}/>
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
