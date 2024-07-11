import React, { Component } from 'react';
import ReactDom from 'react-dom';
import { Router, navigate } from '@gatsbyjs/reach-router';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { siteRoot } from './utils/constants';
import { Utils } from './utils/utils';
import SystemNotification from './components/system-notification';
import EventBus from './components/common/event-bus';
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
import InvitationsView from './pages/invitations/invitations-view';
import Wikis from './pages/wikis/wikis';
import Libraries from './pages/libraries';

import './css/layout.css';
import './css/toolbar.css';
import './css/search.css';


class App extends Component {

  constructor(props) {
    super(props);
    if (window.location.pathname === '/groups/') {
      window.location.href = window.location.origin + '/libraries/';
    }
    this.state = {
      isSidePanelClosed: false,
      isSidePanelFolded: localStorage.getItem('sf_user_side_nav_folded') == 'true' || false,
      currentTab: '',
      pathPrefix: [],
    };
    this.dirViewPanels = ['libraries', 'my-libs', 'shared-libs', 'org']; // and group
    window.onpopstate = this.onpopstate;
    const eventBus = new EventBus();
    this.eventBus = eventBus;
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
          eventBus={this.eventBus}
        />
        <div id="main" className="user-panel">
          <SidePanel
            isSidePanelClosed={isSidePanelClosed}
            isSidePanelFolded={isSidePanelFolded}
            onCloseSidePanel={this.onCloseSidePanel}
            currentTab={currentTab}
            tabItemClick={this.tabItemClick}
            toggleFoldSideNav={this.toggleFoldSideNav}
          />
          <MainPanel>
            <Router className="reach-router">
              <Libraries path={siteRoot} />
              <Libraries path={siteRoot + 'libraries'} />
              <MyLibraries path={siteRoot + 'my-libs'} />
              <MyLibDeleted path={siteRoot + 'my-libs/deleted/'} />
              <ShareAdminShareLinks path={siteRoot + 'share-admin-share-links'} />
              <ShareAdminUploadLinks path={siteRoot + 'share-admin-upload-links'} />
              <PublicSharedView path={siteRoot + 'org/'} />
              <Wikis path={siteRoot + 'published'} />
              <Starred path={siteRoot + 'starred'} />
              <InvitationsView path={siteRoot + 'invitations/'} />
              <FilesActivities path={siteRoot + 'dashboard'} />
              <MyFileActivities path={siteRoot + 'my-activities'} />
              <Group path={siteRoot + 'group/:groupID'} onGroupChanged={this.onGroupChanged} />
              <LinkedDevices path={siteRoot + 'linked-devices'} />
              <ShareAdminLibraries path={siteRoot + 'share-admin-libs'} />
              <ShareAdminFolders path={siteRoot + 'share-admin-folders'} />
              <SharedLibraries path={siteRoot + 'shared-libs'} />
              <ShareWithOCM path={siteRoot + 'shared-with-ocm'} />
              <OCMViaWebdav path={siteRoot + 'ocm-via-webdav'} />
              <OCMRepoDir
                path={siteRoot + 'remote-library/:providerID/:repoID/*'}
                pathPrefix={this.state.pathPrefix}
                onTabNavClick={this.tabItemClick}
              />
              <LibContentView
                path={siteRoot + 'library/:repoID/*'}
                pathPrefix={this.state.pathPrefix}
                isSidePanelFolded={isSidePanelFolded}
                onTabNavClick={this.tabItemClick}
                eventBus={this.eventBus}
              />
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
