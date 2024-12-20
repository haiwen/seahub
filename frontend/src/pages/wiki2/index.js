import React, { Component } from 'react';
import dayjs from 'dayjs';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Utils } from '../../utils/utils';
import wikiAPI from '../../utils/wiki-api';
import SDocServerApi from '../../utils/sdoc-server-api';
import { wikiId, siteRoot, lang, isWiki2, seadocServerUrl, wikiPermission } from '../../utils/constants';
import WikiConfig from './models/wiki-config';
import toaster from '../../components/toast';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import PageUtils from './wiki-nav/page-utils';
import LocalStorage from '../../utils/local-storage-utils';
import { DEFAULT_PAGE_NAME } from './constant';
import { eventBus } from '../../components/common/event-bus';
import { throttle, getNamePaths } from './utils';

import '../../css/layout.css';
import '../../css/side-panel.css';
import '../../css/toolbar.css';
import '../../css/search.css';
import './wiki.css';

dayjs.locale(lang);

class Wiki extends Component {
  constructor(props) {
    super(props);
    this.state = {
      path: '',
      pathExist: true,
      isSidePanelOpen: false,
      isDataLoading: false,
      editorContent: {},
      permission: '',
      isConfigLoading: true,
      currentPageId: '',
      config: new WikiConfig({}),
      repoId: '',
      seadoc_access_token: '',
      assets_url: '',
      wikiRepoId: null,
      isUpdateBySide: false,
    };
  }

  UNSAFE_componentWillMount() {
    if (!Utils.isDesktop()) {
      this.setState({ isSidePanelOpen: true });
    }
  }

  componentDidMount() {
    this.getWikiConfig();
    window.addEventListener('popstate', this.onPopstate);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.currentPageId !== '' && prevState.currentPageId !== this.state.currentPageId) {
      if (!Utils.isDesktop()) {
        this.mobileCloseSidePanel();
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.onPopState);
  }

  onPopstate = (e) => {
    setTimeout(() => {
      if (e.state) {
        const { pageId } = e.state;
        const viaPopstate = true;
        this.setCurrentPage(pageId, undefined, viaPopstate);
      }
    }, 0);
  };

  getCustomUrl = () => {
    const siteRootLen = siteRoot.length;
    const customUrl = window.location.pathname.substring(siteRootLen);
    if (customUrl.includes('wiki/publish')) {
      return customUrl;
    }

    return isWiki2 ? 'wikis/' : 'published/';
  };

  setNavConfig = (config, wikiRepoId) => {
    const { pages } = config;
    const newPages = JSON.parse(JSON.stringify(pages));
    newPages.map((item) => {
      const { path, isDir } = getNamePaths(config, item.id);
      item['path'] = path;
      item['doc_uuid'] = item['docUuid'];
      item['pageId'] = item['id'];
      item['wikiRepoId'] = wikiRepoId;
      item['isDir'] = isDir;
      return item;
    });
    window.wiki.config['navConfig'] = {
      pages: newPages
    };
  };

  getWikiConfig = () => {
    let wikiAPIConfig;
    if (wikiPermission === 'rw') {
      wikiAPIConfig = wikiAPI.getWiki2Config(wikiId);
    } else {
      wikiAPIConfig = wikiAPI.getWiki2PublishConfig(wikiId);
    }
    wikiAPIConfig.then(res => {
      const { wiki_config, repo_id, id: wikiRepoId } = res.data.wiki;
      const config = new WikiConfig(wiki_config || {});
      this.setNavConfig(config, wikiRepoId);
      this.setState({
        config,
        isConfigLoading: false,
        repoId: repo_id,
        wikiRepoId,
      }, () => {
        let pageId = this.getFirstPageId(config);
        // opened by url
        const urlSearchParams = new URLSearchParams(location.search);
        const urlPageId = urlSearchParams.get('page_id');
        if (urlPageId) pageId = urlPageId;
        if (pageId) {
          this.setCurrentPage(pageId);
        }
      });
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({
        isConfigLoading: false,
      });
    });
  };

  updateWikiConfig = (wikiConfig) => {
    this.setState({ config: new WikiConfig(wikiConfig || {}) });
  };

  updatePageNameToServer = throttle((wikiConfig) => {
    wikiAPI.updateWiki2Config(wikiId, JSON.stringify(wikiConfig)).then(res => {
      // nothing todo
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, 1000);

  saveWikiConfig = (wikiConfig, isUpdateBySide = false) => {
    this.setState({
      config: new WikiConfig(wikiConfig),
      isUpdateBySide,
    }, () => {
      this.updatePageNameToServer(wikiConfig);
    });

    if (isUpdateBySide) {
      setTimeout(() => {
        this.setState({ isUpdateBySide: false });
      }, 300);
    }
  };

  getFirstPageId = (config) => {
    if (!config || !Array.isArray(config.navigation)) return '';
    const firstPage = config.navigation[0] || {};
    return firstPage.id;
  };

  getSdocFileContent = (docUuid, accessToken) => {
    const config = {
      docUuid,
      sdocServer: seadocServerUrl,
      accessToken,
    };
    const sdocServerApi = new SDocServerApi(config);
    sdocServerApi.getDocContent().then(res => {
      this.setState({
        isDataLoading: false,
        editorContent: res.data,
      });
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  };

  mobileCloseSidePanel = () => {
    this.setState({ isSidePanelOpen: false });
  };

  mobileOpenSidePanel = () => {
    this.setState({ isSidePanelOpen: true });
  };

  getCurrentPageId = () => {
    return this.state.currentPageId;
  };

  updateSdocPage = (pageId, filePath) => {
    this.setState({
      isDataLoading: true,
    });
    let getWikiPage;
    if (wikiPermission === 'rw') {
      getWikiPage = wikiAPI.getWiki2Page(wikiId, pageId);
    } else {
      getWikiPage = wikiAPI.getWiki2PublishPage(wikiId, pageId);
    }
    getWikiPage.then(res => {
      const { permission, seadoc_access_token, assets_url } = res.data;
      this.setState({
        permission,
        seadoc_access_token,
        assets_url,
        path: filePath,
      });
      const docUuid = assets_url.slice(assets_url.lastIndexOf('/') + 1);
      this.getSdocFileContent(docUuid, seadoc_access_token);
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  };

  cacheHistoryFiles = (docUuid, name, pageId, icon) => {
    let arr = [];
    const { wikiRepoId, config } = this.state; // different from repoId
    const { path, isDir } = getNamePaths(config, pageId);
    const recentFiles = LocalStorage.getItem('wiki-recent-files', []);
    const newFile = {
      doc_uuid: docUuid,
      name,
      wikiRepoId,
      pageId,
      icon,
      path,
      isDir
    };
    if (recentFiles.length) {
      if (recentFiles.length === 50) {
        recentFiles.pop();
      }

      const fileIndex = recentFiles.findIndex((item) => item.doc_uuid === docUuid);
      if (fileIndex !== -1) {
        recentFiles.splice(fileIndex, 1);
      }
      let newRecentFiles = recentFiles.slice(0);
      arr = [newFile, ...newRecentFiles];
    } else {
      arr.push(newFile);
    }
    LocalStorage.setItem('wiki-recent-files', arr);
  };

  setCurrentPage = (pageId, callback, viaPopstate) => {
    if (pageId === this.state.currentPageId) {
      callback && callback();
      return;
    }
    const { config } = this.state;
    const { pages } = config;
    const currentPage = PageUtils.getPageById(pages, pageId);
    if (!currentPage) {
      callback && callback();
      return;
    }
    const { path, id, name, docUuid, icon } = currentPage;
    if (path !== this.state.path) {
      this.updateSdocPage(pageId, path);
    }
    this.setState({
      currentPageId: pageId,
      path: path,
    }, () => {
      callback && callback();
      eventBus.dispatch('update-wiki-current-page');
    });
    this.cacheHistoryFiles(docUuid, name, id, icon);
    this.updateDocumentTitle(name);

    if (viaPopstate) {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('page_id', pageId);
    let customUrl = this.getCustomUrl();
    let url = `${siteRoot}${customUrl}${wikiId}/?${params.toString()}`;
    if (customUrl.includes('wiki/publish')) {
      url = `${siteRoot}${customUrl}?${params.toString()}`;
    }
    window.history.pushState({ url: url, path: path, pageId: pageId }, '', url);
  };

  onUpdatePage = (pageId, newPage, isUpdateBySide) => {
    if (newPage.name === '') {
      newPage.name = DEFAULT_PAGE_NAME;
    }
    if (this.state.currentPageId === pageId) {
      this.updateDocumentTitle(newPage.name);
    }
    const { config } = this.state;
    let pages = config.pages;
    let newPages = pages.map(page => {
      if (page.id === pageId) {
        return { ...page, ...newPage };
      }
      return page;
    });
    const newConfig = { ...config, pages: newPages };
    this.saveWikiConfig(newConfig, isUpdateBySide);
  };

  updateDocumentTitle = (newTitle) => {
    document.title = newTitle;
  };

  render() {
    return (
      <div id="main" className="wiki-main">
        <SidePanel
          isLoading={this.state.isConfigLoading}
          isSidePanelOpen={this.state.isSidePanelOpen}
          config={this.state.config}
          updateWikiConfig={this.updateWikiConfig}
          getWikiConfig={this.getWikiConfig}
          setCurrentPage={this.setCurrentPage}
          getCurrentPageId={this.getCurrentPageId}
          onUpdatePage={this.onUpdatePage}
        />
        <MainPanel
          mobileOpenSidePanel={this.mobileOpenSidePanel}
          path={this.state.path}
          config={this.state.config}
          currentPageId={this.state.currentPageId}
          pathExist={this.state.pathExist}
          isDataLoading={this.state.isDataLoading}
          editorContent={this.state.editorContent}
          permission={this.state.permission}
          seadoc_access_token={this.state.seadoc_access_token}
          assets_url={this.state.assets_url}
          onUpdatePage={this.onUpdatePage}
          setCurrentPage={this.setCurrentPage}
          isUpdateBySide={this.state.isUpdateBySide}
        />
        <MediaQuery query="(max-width: 767.8px)">
          <Modal
            zIndex="1030"
            isOpen={this.state.isSidePanelOpen}
            toggle={this.mobileCloseSidePanel}
            contentClassName="d-none"
          >
          </Modal>
        </MediaQuery>
      </div>
    );
  }
}

export default Wiki;
