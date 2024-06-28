import React, { Component } from 'react';
import ReactDom from 'react-dom';
import { Router, navigate } from '@gatsbyjs/reach-router';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { siteRoot } from './utils/constants';
import { Utils } from './utils/utils';
import SystemNotification from './components/system-notification';
import Header from './components/header';
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import FilesActivities from './pages/dashboard/files-activities';
import MyFileActivities from './pages/dashboard/my-file-activities';
import Starred from './pages/starred/starred';
import LinkedDevices from './pages/linked-devices/linked-devices';
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
import PublicSharedView from './pages/shared-with-all';
import LibContentView from './pages/lib-content-view/lib-content-view';
import Group from './pages/groups/group-view';
import Groups from './pages/groups/groups-view';
import InvitationsView from './pages/invitations/invitations-view';
import Wikis from './pages/wikis/wikis';
import Libraries from './pages/libraries';
import MainContentWrapper from './components/main-content-wrapper';

import './css/layout.css';
import './css/toolbar.css';
import './css/search.css';

const FilesActivitiesWrapper = MainContentWrapper(FilesActivities);
const MyFileActivitiesWrapper = MainContentWrapper(MyFileActivities);
const StarredWrapper = MainContentWrapper(Starred);
const LinkedDevicesWrapper = MainContentWrapper(LinkedDevices);
const SharedLibrariesWrapper = MainContentWrapper(SharedLibraries);
const SharedWithOCMWrapper = MainContentWrapper(ShareWithOCM);
const OCMViaWebdavWrapper = MainContentWrapper(OCMViaWebdav);
const InvitationsViewWrapper = MainContentWrapper(InvitationsView);
const ShareAdminLibrariesWrapper = MainContentWrapper(ShareAdminLibraries);
const ShareAdminFoldersWrapper = MainContentWrapper(ShareAdminFolders);

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isSidePanelClosed: false,
      isSidePanelFolded: localStorage.getItem('sf_user_side_nav_folded') == 'true' || false,
      currentTab: '',
      pathPrefix: [],
    };
    this.dirViewPanels = ['libraries', 'my-libs', 'shared-libs', 'org']; // and group
    window.onpopstate = this.onpopstate;
  }

  onpopstate = (event) => {
    if (event.state && event.state.currentTab && event.state.pathPrefix) {
      let { currentTab, pathPrefix } = event.state;
      this.setState({currentTab, pathPrefix});
    }
  };

  UNSAFE_componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({
        isSidePanelClosed: true
      });
    }
  }

  navigateClientUrlToLib = () =>{
    if (window.location.hash && window.location.hash.indexOf('common/lib') != -1) {
      let splitUrlArray = window.location.hash.split('/');
      let repoID = splitUrlArray[splitUrlArray.length - 2];
      let url = siteRoot + 'library/' + repoID + '/';
      navigate(url, {repalce: true});
    }
  };

  componentDidMount() {
    // url from client  e.g. http://127.0.0.1:8000/#common/lib/34e7fb92-e91d-499d-bcde-c30ea8af9828/
    // navigate to library page http://127.0.0.1:8000/library/34e7fb92-e91d-499d-bcde-c30ea8af9828/
    this.navigateClientUrlToLib();

    let currentTab;
    // when visit the siteRoot page, highlight the 'Files' tab in the side nav.
    if (location.pathname == siteRoot) {
      currentTab = 'libraries';
    } else {
      let href = window.location.href.split('/');
      currentTab = href[href.length - 2];
    }
    this.setState({currentTab: currentTab});
  }

  onCloseSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

  onShowSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

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
  };

  onGroupChanged = (groupID) => {
    setTimeout(function() {
      let url;
      if (groupID) {
        url = siteRoot + 'group/' + groupID + '/';
      }
      else {
        url = siteRoot + 'libraries/';
      }
      window.location = url.toString();
    }, 1);
  };

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
  };

  generatorPrefix = (tabName, groupID) => {
    let pathPrefix = [];
    if (groupID) {
      let navTab = {
        url: siteRoot + 'group/' + groupID + '/',
        showName: tabName,
        name: tabName,
        id: groupID,
      };
      pathPrefix.push(navTab);
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
  };

  getTabShowName = (tabName) => {
    switch (tabName) {
      case 'libraries': {
        return 'Files';
      }
      case 'my-libs': {
        return 'My Libraries';
      }
      case 'shared-libs': {
        return 'Shared with me';
      }
      case 'org': {
        return 'Shared with all';
      }
    }
  };

  toggleSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

  toggleFoldSideNav = () => {
    this.setState({
      isSidePanelFolded: !this.state.isSidePanelFolded
    }, () => {
      localStorage.setItem('sf_user_side_nav_folded', this.state.isSidePanelFolded);
    });
  };

  render() {
    const { currentTab, isSidePanelClosed, isSidePanelFolded } = this.state;

    return (
      <React.Fragment>
        <SystemNotification />
        <Header
          isSidePanelClosed={isSidePanelClosed}
          onCloseSidePanel={this.onCloseSidePanel}
          onShowSidePanel={this.onShowSidePanel}
          onSearchedClick={this.onSearchedClick}
        />
        <div id="main">
          <SidePanel
            isSidePanelClosed={isSidePanelClosed}
            isSidePanelFolded={isSidePanelFolded}
            onCloseSidePanel={this.onCloseSidePanel}
            currentTab={currentTab}
            tabItemClick={this.tabItemClick}
            showLogoOnlyInMobile={true}
            toggleFoldSideNav={this.toggleFoldSideNav}
          />
          <MainPanel>
            <Router className="reach-router">
              <Libraries path={ siteRoot } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <Libraries path={ siteRoot + 'libraries' } onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <FilesActivitiesWrapper path={siteRoot + 'dashboard'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
              <MyFileActivitiesWrapper path={siteRoot + 'my-activities'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
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
                onGroupChanged={this.onGroupChanged}
              />
              <Wikis path={siteRoot + 'published'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick}/>
              <PublicSharedView path={siteRoot + 'org/'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} onTabNavClick={this.tabItemClick}/>
              <InvitationsViewWrapper path={siteRoot + 'invitations/'} onShowSidePanel={this.onShowSidePanel} onSearchedClick={this.onSearchedClick} />
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
