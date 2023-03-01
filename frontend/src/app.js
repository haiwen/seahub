import React, { Component } from 'react';
import ReactDom from 'react-dom';
import { Router, navigate } from '@gatsbyjs/reach-router';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { siteRoot, canAddRepo, isDocs } from './utils/constants';
import { Utils } from './utils/utils';
import SystemNotification from './components/system-notification';
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import DraftsView from './pages/drafts/drafts-view';
import DraftContent from './pages/drafts/draft-content';
import FilesActivities from './pages/dashboard/files-activities';
import Starred from './pages/starred/starred';
import LinkedDevices from './pages/linked-devices/linked-devices';
import editUtilities from './utils/editor-utilities';
import ShareAdminLibraries from './pages/share-admin/libraries';
import ShareAdminFolders from './pages/share-admin/folders';
import ShareAdminShareLinks from './pages/share-admin/share-links';
import ShareAdminUploadLinks from './pages/share-admin/upload-links';
import SharedLibraries from './pages/shared-libs/shared-libs';
import ShareWithOCM from './pages/share-with-ocm/shared-with-ocm';
import OCMViaWebdav from './pages/ocm-via-webdav/ocm-via-webdav';
import OCMRepoDir from './pages/share-with-ocm/remote-dir-view';
import MyLibraries from './pages/my-libs/my-libs';
import MyLibDeleted from './pages/my-libs/my-libs-deleted';
import PublicSharedView from './pages/shared-with-all/public-shared-view';
import LibContentView from './pages/lib-content-view/lib-content-view';
import Group from './pages/groups/group-view';
import Groups from './pages/groups/groups-view';
import InvitationsView from './pages/invitations/invitations-view';
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
const SharedWithOCMWrapper = MainContentWrapper(ShareWithOCM);
const OCMViaWebdavWrapper = MainContentWrapper(OCMViaWebdav);
const ShareAdminLibrariesWrapper = MainContentWrapper(ShareAdminLibraries);
const ShareAdminFoldersWrapper = MainContentWrapper(ShareAdminFolders);

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
    window.onpopstate = this.onpopstate;
  }

  onpopstate = (event) => {
    if (event.state && event.state.currentTab && event.state.pathPrefix) {
      let { currentTab, pathPrefix } = event.state;
      this.setState({currentTab, pathPrefix});
    }
  }

  componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({
        isSidePanelClosed: true
      });
    }
  }

  navigateClientUrlToLib = () =>{
    if(window.location.hash && window.location.hash.indexOf('common/lib') != -1){
      let splitUrlArray = window.location.hash.split('/');
      let repoID = splitUrlArray[splitUrlArray.length - 2];
      let url = siteRoot + 'library/' + repoID + '/';
      navigate(url, {repalce: true});
    }
  }

  componentDidMount() {
    // url from client  e.g. http://127.0.0.1:8000/#common/lib/34e7fb92-e91d-499d-bcde-c30ea8af9828/
    // navigate to library page http://127.0.0.1:8000/library/34e7fb92-e91d-499d-bcde-c30ea8af9828/
    this.navigateClientUrlToLib();

    // e.g.  from http://127.0.0.1:8000/drafts/reviews/
    // get reviews
    // TODO: need refactor later
    let href = window.location.href.split('/');
    if (isDocs) {
      this.getDrafts();
    }
    this.setState({currentTab: href[href.length - 2]});
  }

  getDrafts = () => {
    editUtilities.listDrafts().then(res => {
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
      let isWeChat = Utils.isWeChat();
      if (!isWeChat) {
        let newWindow = window.open('about:blank');
        newWindow.location.href = url;
      } else {
        location.href = url;
      }
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
    }, () => {
      let { currentTab, pathPrefix } = this.state;
      window.history.replaceState({currentTab: currentTab, pathPrefix: pathPrefix}, null);
    });
    if (!Utils.isDesktop() && !this.state.isSidePanelClosed) {
      this.setState({ isSidePanelClosed: true });
    }
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

  toggleSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  }

  render() {
    let { currentTab, isSidePanelClosed } = this.state;

    const home = canAddRepo ?
      <MyLibraries path={ siteRoot } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} /> :
      <SharedLibrariesWrapper path={ siteRoot } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />;

    return (
      <React.Fragment>
        <SystemNotification />
        <div id="main">
          <SidePanel isSidePanelClosed={this.state.isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick} draftCounts={this.state.draftCounts} />
          <MainPanel>
            <Router className="reach-router">
              {home}
              <FilesActivitiesWrapper path={siteRoot + 'dashboard'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <DraftsViewWrapper path={siteRoot + 'drafts'}
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
              </DraftsViewWrapper>
              <StarredWrapper path={siteRoot + 'starred'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <LinkedDevicesWrapper path={siteRoot + 'linked-devices'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <ShareAdminLibrariesWrapper path={siteRoot + 'share-admin-libs'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <ShareAdminFoldersWrapper path={siteRoot + 'share-admin-folders'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <ShareAdminShareLinks path={siteRoot + 'share-admin-share-links'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <ShareAdminUploadLinks path={siteRoot + 'share-admin-upload-links'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <SharedLibrariesWrapper path={siteRoot + 'shared-libs'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <SharedWithOCMWrapper path={siteRoot + 'shared-with-ocm'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <OCMViaWebdavWrapper path={siteRoot + 'ocm-via-webdav'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <MyLibraries path={siteRoot + 'my-libs'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <MyLibDeleted path={siteRoot + 'my-libs/deleted/'} onSearchedClick={this.onSearchedClick} />
              <LibContentView path={siteRoot + 'library/:repoID/*'} pathPrefix={this.state.pathPrefix} onMenuClick={this.onShowSidePanel} onTabNavClick={this.tabItemClick}/>
              <OCMRepoDir path={siteRoot + 'remote-library/:providerID/:repoID/*'} pathPrefix={this.state.pathPrefix} onMenuClick={this.onShowSidePanel} onTabNavClick={this.tabItemClick}/>
              <Groups path={siteRoot + 'groups'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
              <Group
                path={siteRoot + 'group/:groupID'}
                onShowSidePanel={this.onShowSidePanel}
                onSearchedClick={this.onSearchedClick}
                onTabNavClick={this.tabItemClick}
                onGroupChanged={this.onGroupChanged}
              />
              <Wikis path={siteRoot + 'published'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
              <PublicSharedView path={siteRoot + 'org/'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} onTabNavClick={this.tabItemClick}/>
              <InvitationsView path={siteRoot + 'invitations/'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
            </Router>
          </MainPanel>
          <MediaQuery query="(max-width: 767.8px)">
            <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={this.toggleSidePanel} contentClassName="d-none"></Modal>
          </MediaQuery>
        </div>
      </React.Fragment>
    );
  }
}

ReactDom.render(<App />, document.getElementById('wrapper'));
