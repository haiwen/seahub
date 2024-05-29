import React, { Component } from 'react';
import moment from 'moment';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Utils } from '../../utils/utils';
import wikiAPI from '../../utils/wiki-api';
import SDocServerApi from '../../utils/sdoc-server-api';
import { wikiId, siteRoot, lang, isWiki2, seadocServerUrl } from '../../utils/constants';
import WikiConfig from './models/wiki-config';
import toaster from '../../components/toast';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import PageUtils from './view-structure/page-utils';

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
      isViewFile: true,
      isDataLoading: false,
      editorContent: {},
      permission: '',
      isConfigLoading: true,
      currentPageId: '',
      config: new WikiConfig({}),
      repoId: '',
      seadoc_access_token: '',
      assets_url: '',
    };

    this.pythonWrapper = null;
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
      const { wiki_config, repo_id } = res.data.wiki;
      const config = new WikiConfig(wiki_config || {});
      this.setState({
        config,
        isConfigLoading: false,
        repoId: repo_id,
      }, () => {
        const pageId = this.getFirstPageId(config);
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

  saveWikiConfig = (wikiConfig, onSuccess, onError) => {
    wikiAPI.updateWiki2Config(wikiId, JSON.stringify(wikiConfig)).then(res => {
      this.setState({
        config: new WikiConfig(wikiConfig || {}),
      });
      onSuccess && onSuccess();
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      onError && onError();
    });
  };

  getFirstPageId = (config) => {
    if (!config || !Array.isArray(config.navigation)) return '';
    for (let i = 0; i < config.navigation.length; i++) {
      const item = config.navigation[i] || {};
      if (item.type === 'page') {
        return item.id;
      }
      if (item.type === 'folder' && item.children[0]) {
        return item.children[0].id;
      }
    }
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

  removePythonWrapper = () => {
    if (this.pythonWrapper) {
      document.body.removeChild(this.pythonWrapper);
      this.pythonWrapper = null;
    }
  };

  onCloseSide = () => {
    this.setState({ closeSideBar: !this.state.closeSideBar });
  };

  showPage = (pageId, filePath) => {
    this.setState({
      isDataLoading: true,
    });

    this.removePythonWrapper();
    wikiAPI.getWiki2Page(wikiId, pageId).then(res => {
      const { permission, seadoc_access_token, assets_url } = res.data;
      this.setState({
        permission,
        seadoc_access_token,
        assets_url,
        isViewFile: true,
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

  setCurrentPage = (pageId, callback) => {
    const { currentPageId, config } = this.state;
    if (pageId === currentPageId) {
      callback && callback();
      return;
    }
    const { pages } = config;
    const currentPage = PageUtils.getPageById(pages, pageId);
    const path = currentPage.path;
    if (path !== this.state.path) {
      this.showPage(pageId, path);
    }
    this.onCloseSide();
    this.setState({
      currentPageId: pageId,
      path: path,
    }, () => {
      callback && callback();
    });
  };

  render() {
    return (
      <div id="main" className="wiki-main">
        <SidePanel
          isLoading={this.state.isConfigLoading}
          closeSideBar={this.state.closeSideBar}
          onCloseSide={this.onCloseSide}
          config={this.state.config}
          saveWikiConfig={this.saveWikiConfig}
          setCurrentPage={this.setCurrentPage}
          currentPageId={this.state.currentPageId}
        />
        <MainPanel
          path={this.state.path}
          config={this.state.config}
          currentPageId={this.state.currentPageId}
          pathExist={this.state.pathExist}
          isViewFile={this.state.isViewFile}
          isDataLoading={this.state.isDataLoading}
          editorContent={this.state.editorContent}
          permission={this.state.permission}
          seadoc_access_token={this.state.seadoc_access_token}
          assets_url={this.state.assets_url}
        />
        <MediaQuery query="(max-width: 767.8px)">
          <Modal isOpen={!this.state.closeSideBar} toggle={this.onCloseSide} contentClassName="d-none"></Modal>
        </MediaQuery>
      </div>
    );
  }
}

export default Wiki;
