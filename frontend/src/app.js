import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { Router, navigate, LocationProvider, globalHistory } from '@gatsbyjs/reach-router';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { siteRoot, siteTitle, mediaUrl, faviconPath } from './utils/constants';
import { Utils, isMobile } from './utils/utils';
import SystemNotification from './components/system-notification';
import EventBus from './components/common/event-bus';
import Header from './components/header';
import SystemUserNotification from './components/system-user-notification';
import SidePanel from './components/side-panel';
import ResizeBar from './components/resize-bar';
import {
  DRAG_HANDLER_HEIGHT,
  INIT_SIDE_PANEL_RATE,
  MAX_SIDE_PANEL_RATE,
  MIN_SIDE_PANEL_RATE
} from './components/resize-bar/constants';
import FilesActivities from './pages/dashboard/files-activities';
import Starred from './pages/starred/starred';
import LinkedDevices from './pages/linked-devices/linked-devices';
import ShareAdminLibraries from './pages/share-admin/libraries';
import ShareAdminFolders from './pages/share-admin/folders';
import ShareAdminShareLinks from './pages/share-admin/share-links';
import ShareAdminUploadLinks from './pages/share-admin/upload-links';
import SharedLibraries from './pages/shared-libs';
import ShareWithOCM from './pages/share-with-ocm/shared-with-ocm';
import OCMViaWebdav from './pages/ocm-via-webdav/ocm-via-webdav';
import OCMRepoDir from './pages/share-with-ocm/remote-dir-view';
import MyLibraries from './pages/my-libs/my-libs';
import MyLibDeleted from './pages/my-libs/my-libs-deleted';
import SharedWithAll from './pages/shared-with-all';
import LibContentView from './pages/lib-content-view/lib-content-view';
import GroupView from './pages/groups/group-view';
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
      isSidePanelFolded: isMobile ? false : (localStorage.getItem('sf_user_side_nav_folded') == 'true' || false),
      currentTab: '',
      pathPrefix: [],
      inResizing: false,
      sidePanelRate: parseFloat(localStorage.getItem('sf_side_panel_rate') || INIT_SIDE_PANEL_RATE),
    };
    this.dirViewPanels = ['libraries', 'my-libs', 'shared-libs', 'org']; // and group
    window.onpopstate = this.onpopstate;
    const eventBus = new EventBus();
    this.eventBus = eventBus;
    this.resizeBarRef = React.createRef();
    this.dragHandlerRef = React.createRef();
  }

  onpopstate = (event) => {
    if (event.state && event.state.currentTab && event.state.pathPrefix) {
      let { currentTab, pathPrefix } = event.state;
      this.setState({ currentTab, pathPrefix });
    }
  };

  UNSAFE_componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({
        isSidePanelClosed: true
      });
    }
  }

  navigateClientUrlToLib = () => {
    if (window.location.hash && window.location.hash.indexOf('common/lib') != -1) {
      let splitUrlArray = window.location.hash.split('/');
      let repoID = splitUrlArray[splitUrlArray.length - 2];
      let url = siteRoot + 'library/' + repoID + '/';
      navigate(url, { replace: true });
    }
  };

  componentDidMount() {
    // url from client  e.g. http://127.0.0.1:8000/#common/lib/34e7fb92-e91d-499d-bcde-c30ea8af9828/
    // navigate to library page http://127.0.0.1:8000/library/34e7fb92-e91d-499d-bcde-c30ea8af9828/
    this.navigateClientUrlToLib();

    this.initCurrentTabByLocation();
    this.colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.colorSchemeQuery.addEventListener('change', this.handleColorSchemeChange);
  }

  componentWillUnmount() {
    this.colorSchemeQuery.removeEventListener('change', this.handleColorSchemeChange);
  }

  handleColorSchemeChange = (e) => {
    const isDark = e.matches;
    document.body.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    this.forceUpdate();
  };

  initCurrentTabByLocation = () => {
    // when visit the siteRoot page, highlight the 'Libraries' tab in the side nav.
    if (location.pathname == siteRoot) {
      this.setState({ currentTab: 'libraries' });
      return;
    }

    // get path part start with siteRoot. e.g. '/' or '/xxx/'
    let pathPart = window.location.pathname.split(siteRoot)[1];
    pathPart = pathPart && pathPart.split('/')[0];

    let currentTab = '';
    if (pathPart) {
      currentTab = pathPart;
    }

    // when visit a 'dir view' page(http://127.0.0.1:8000/library/1137c0c3-5a5d-4da1-8fd0-69e227a9a23e/My%20Library/) directly via URL,
    // emulate visiting it from 'Libraries' page(get the `currentTab` & `pathPrefix`)
    if (currentTab === 'library') {
      currentTab = 'libraries';
    }

    this.setState({ currentTab });
  };

  resetTitle = () => {
    const favicon = document.getElementById('favicon');
    favicon.href = `${mediaUrl}${faviconPath}`;
    document.title = siteTitle;
  };

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
      this.setState({ currentTab: '', pathPrefix: [] });
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, { replace: true });
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
      window.history.replaceState({ currentTab: currentTab, pathPrefix: pathPrefix }, null);
    });
    if (!Utils.isDesktop() && !this.state.isSidePanelClosed) {
      this.setState({ isSidePanelClosed: true });
    }
    this.resetTitle();
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
        return 'Libraries';
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

  onResizeMouseUp = () => {
    if (this.state.inResizing) {
      this.setState({
        inResizing: false
      });
    }
    localStorage.setItem('sf_side_panel_rate', this.state.sidePanelRate);
  };

  onResizeMouseDown = () => {
    this.setState({
      inResizing: true
    });
  };

  onResizeMouseMove = (e) => {
    let rate = e.nativeEvent.clientX / window.innerWidth;
    this.setState({
      sidePanelRate: Math.max(Math.min(rate, MAX_SIDE_PANEL_RATE), MIN_SIDE_PANEL_RATE),
    });
  };

  onResizeMouseOver = (event) => {
    if (!this.dragHandlerRef.current) return;
    const { top } = this.resizeBarRef.current.getBoundingClientRect();
    const dragHandlerRefTop = event.pageY - top - DRAG_HANDLER_HEIGHT / 2;
    this.setDragHandlerTop(dragHandlerRefTop);
  };

  setDragHandlerTop = (top) => {
    this.dragHandlerRef.current.style.top = top + 'px';
  };

  render() {
    const { currentTab, isSidePanelClosed, isSidePanelFolded, sidePanelRate, inResizing } = this.state;
    let mainPanelStyle = {};
    let sidePanelStyle = {};
    if (!isSidePanelFolded) {
      mainPanelStyle = {
        userSelect: inResizing ? 'none' : '',
        flex: sidePanelRate ? `1 0 ${(1 - sidePanelRate) * 100}%` : `0 0 ${100 - INIT_SIDE_PANEL_RATE * 100}%`,
      };
      sidePanelStyle = {
        userSelect: inResizing ? 'none' : '',
        flex: sidePanelRate ? `0 0 ${sidePanelRate * 100}%` : `0 0 ${INIT_SIDE_PANEL_RATE * 100}%`,
      };
    }
    const isWikisPage = window.location.pathname.includes('/published');
    const searchType = isWikisPage ? 'wikis' : 'files';
    return (
      <React.Fragment>
        <SystemNotification />
        <SystemUserNotification />
        <Header
          isSidePanelClosed={isSidePanelClosed}
          onCloseSidePanel={this.onCloseSidePanel}
          onShowSidePanel={this.onShowSidePanel}
          onSearchedClick={this.onSearchedClick}
          eventBus={this.eventBus}
          isSidePanelFolded={isSidePanelFolded}
          searchType={searchType}
        />
        <div
          id="main"
          className="user-panel"
          onMouseMove={inResizing ? this.onResizeMouseMove : null}
          onMouseUp={this.onResizeMouseUp}
        >
          <SidePanel
            isSidePanelClosed={isSidePanelClosed}
            isSidePanelFolded={isSidePanelFolded}
            onCloseSidePanel={this.onCloseSidePanel}
            currentTab={currentTab}
            tabItemClick={this.tabItemClick}
            toggleFoldSideNav={this.toggleFoldSideNav}
            style={sidePanelStyle}
            eventBus={this.eventBus}
          />
          {Utils.isDesktop() && !isSidePanelFolded &&
            <ResizeBar
              resizeBarRef={this.resizeBarRef}
              dragHandlerRef={this.dragHandlerRef}
              resizeBarStyle={{ left: `calc(${sidePanelRate ? sidePanelRate * 100 + '%' : `${INIT_SIDE_PANEL_RATE * 100}%`} - 1px)` }}
              dragHandlerStyle={{ height: DRAG_HANDLER_HEIGHT }}
              onResizeMouseDown={this.onResizeMouseDown}
              onResizeMouseOver={this.onResizeMouseOver}
            />
          }
          <div className="main-panel" style={mainPanelStyle}>
            <Router className="reach-router">
              <Libraries path={siteRoot} />
              <Libraries path={siteRoot + 'libraries'} />
              <MyLibraries path={siteRoot + 'my-libs'} />
              <MyLibDeleted path={siteRoot + 'my-libs/deleted/'} />
              <ShareAdminShareLinks path={siteRoot + 'share-admin-share-links'} />
              <ShareAdminUploadLinks path={siteRoot + 'share-admin-upload-links'} />
              <SharedWithAll path={siteRoot + 'org/'} />
              <Wikis
                path={siteRoot + 'published'}
                sidePanelRate={sidePanelRate}
                isSidePanelFolded={isSidePanelFolded}
              />
              <Starred path={siteRoot + 'starred'} />
              <InvitationsView path={siteRoot + 'invitations/'} />
              <FilesActivities path={`${siteRoot}activities/*`} />
              <GroupView path={siteRoot + 'group/:groupID'} />
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
                resetTitle={this.resetTitle}
              />
            </Router>
          </div>
          <MediaQuery query="(max-width: 767.8px)">
            <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={this.toggleSidePanel} contentClassName="d-none"></Modal>
          </MediaQuery>
        </div>
      </React.Fragment>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <LocationProvider history={globalHistory}>
    <App />
  </LocationProvider>
);
