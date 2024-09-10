import React, { Component } from 'react';
import moment from 'moment';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Utils } from '../../utils/utils';
import wikiAPI from '../../utils/wiki-api';
import SDocServerApi from '../../utils/sdoc-server-api';
import { wikiId, siteRoot, lang, isWiki2, seadocServerUrl, gettext } from '../../utils/constants';
import WikiConfig from './models/wiki-config';
import toaster from '../../components/toast';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import PageUtils from './wiki-nav/page-utils';
import LocalStorage from '../../utils/local-storage-utils';

import '../../css/layout.css';
import '../../css/side-panel.css';
import '../../css/toolbar.css';
import '../../css/search.css';
import './wiki.css';

moment.locale(lang);

class Wiki extends Component {
  constructor(props) {
    super(props);
    this.state = {
      path: '',
      pathExist: true,
      closeSideBar: false,
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
      this.setState({ closeSideBar: true });
    }
  }

  componentDidMount() {
    this.getWikiConfig();
  }

  handlePath = () => {
    return isWiki2 ? 'wikis/' : 'published/';
  };

  getWikiConfig = () => {
    wikiAPI.getWiki2Config(wikiId).then(res => {
      const { wiki_config, repo_id, id: wikiRepoId } = res.data.wiki;
      const config = new WikiConfig(wiki_config || {});
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

  saveWikiConfig = (wikiConfig, isUpdateBySide = false) => {
    wikiAPI.updateWiki2Config(wikiId, JSON.stringify(wikiConfig)).then(res => {
      this.setState({
        config: new WikiConfig(wikiConfig),
        isUpdateBySide,
      });
      if (isUpdateBySide) {
        setTimeout(() => {
          this.setState({ isUpdateBySide: false });
        }, 300);
      }
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
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

  onCloseSide = () => {
    this.setState({ closeSideBar: !this.state.closeSideBar });
  };

  showPage = (pageId, filePath) => {
    this.setState({
      isDataLoading: true,
    });
    wikiAPI.getWiki2Page(wikiId, pageId).then(res => {
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

    const params = new URLSearchParams(window.location.search);
    params.set('page_id', pageId);
    const fileUrl = `${siteRoot}${this.handlePath()}${wikiId}/?${params.toString()}`;
    window.history.pushState({ url: fileUrl, path: filePath }, filePath, fileUrl);
  };

  cacheHistoryFiles = (docUuid, name, pageId) => {
    let arr = [];
    const { wikiRepoId } = this.state; // different from repoId
    const recentFiles = LocalStorage.getItem('wiki-recent-files', []);
    const newFile = { doc_uuid: docUuid, name: name, wikiRepoId, pageId };
    if (recentFiles.length) {
      const isExist = recentFiles.find((item) => item.doc_uuid === docUuid);
      if (isExist) return;
      if (!isExist) {
        let newRecentFiles = recentFiles.slice(0);
        if (recentFiles.length === 10) {
          newRecentFiles.shift();
        }
        arr = [newFile, ...newRecentFiles];
      }
    } else {
      arr.push(newFile);
    }
    LocalStorage.setItem('wiki-recent-files', arr);
  };

  setCurrentPage = (pageId, callback) => {
    const { currentPageId, config } = this.state;
    if (pageId === currentPageId) {
      callback && callback();
      return;
    }
    const { pages } = config;
    const currentPage = PageUtils.getPageById(pages, pageId);
    if (!currentPage) {
      callback && callback();
      return;
    }
    const { path, id, name, docUuid } = currentPage;
    if (path !== this.state.path) this.showPage(pageId, path);
    this.onCloseSide();
    this.setState({
      currentPageId: pageId,
      path: path,
    }, () => {
      callback && callback();
    });
    this.cacheHistoryFiles(docUuid, name, id);
    this.updateDocumentTitle(name);
  };

  onUpdatePage = (pageId, newPage, isUpdateBySide) => {
    if (newPage.name === '') {
      toaster.danger(gettext('Page name cannot be empty'));
      return;
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
          closeSideBar={this.state.closeSideBar}
          onCloseSide={this.onCloseSide}
          config={this.state.config}
          updateWikiConfig={this.updateWikiConfig}
          getWikiConfig={this.getWikiConfig}
          setCurrentPage={this.setCurrentPage}
          currentPageId={this.state.currentPageId}
          onUpdatePage={this.onUpdatePage}
        />
        <MainPanel
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
          isUpdateBySide={this.state.isUpdateBySide}
        />
        <MediaQuery query="(max-width: 767.8px)">
          <Modal isOpen={!this.state.closeSideBar} toggle={this.onCloseSide} contentClassName="d-none"></Modal>
        </MediaQuery>
      </div>
    );
  }
}

export default Wiki;
