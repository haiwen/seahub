import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SdocWikiEditor, DocInfo, ErrorBoundary, EXTERNAL_EVENT } from '@seafile/seafile-sdoc-editor';
import { CollaboratorsProvider, CommentContextProvider, EventBus, PluginsProvider, RightPanel } from '@seafile/sdoc-editor';
import { gettext, wikiPermission, wikiId, siteRoot, isPro, seadocServerUrl, mediaUrl } from '../../utils/constants';
import Switch from '../../components/switch';
import CustomDropdown from '../../components/dropdown';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import WikiTopNav from './top-nav';
import { getCurrentPageConfig } from './utils';
import RightHeader from './wiki-right-header';
import CommentPlugin from './wiki-comment/plugin-item';
import User from '../../metadata/model/user';
import { metadataAPI } from '../../metadata';
import classnames from 'classnames';
import wikiAPI from '../../utils/wiki-api';
import WikiRightPanel from './wiki-right-panel';
import SDocServerApi from '../../utils/sdoc-server-api';
import Icon from '../../components/icon';
import WikiCollaboratorsOperation from './wiki-collaborators-operation';
import { seafileAPI } from '../../utils/seafile-api';
import isHotkey from 'is-hotkey';

const HASH_SCROLL_DELAY = 100;
const HASH_SCROLL_RETRY_DELAY = 150;
const HASH_SCROLL_MAX_RETRIES = 5;

const propTypes = {
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  isDataLoading: PropTypes.bool.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  editorContent: PropTypes.object,
  permission: PropTypes.string,
  seadoc_access_token: PropTypes.string,
  assets_url: PropTypes.string,
  config: PropTypes.object,
  currentPageId: PropTypes.string,
  isUpdateBySide: PropTypes.bool,
  onUpdatePageConfig: PropTypes.func,
  updatePageLock: PropTypes.func,
  currentPageLocked: PropTypes.bool,
  onAddWikiPage: PropTypes.func,
  style: PropTypes.object.isRequired,
  mobileOpenSidePanel: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      docUuid: '',
      currentPageConfig: {},
      isShowRightPanel: false,
      collaborators: [],
      editor: {},
      unseenNotificationsCount: 0,
      isPreviewFile: false,
      docContent: {},
      previewDocUuid: '',
      isReloadingPreview: true,
      previewDocInfo: {}
    };
    this.scrollRef = React.createRef();
    this.hashScrollTimer = null;
  }

  static getDerivedStateFromProps(props, state) {
    const { seadoc_access_token, currentPageId, config } = props;
    const appConfig = window.app.config;
    const pageOptions = window.app.pageOptions;
    const { repos = [], wikiSettings = {} } = window.wiki.config;
    const { assetsUrl, seadocServerUrl: sdocServer, publishUrl, wikiId, permission } = window.wiki.config;

    const currentPageConfig = getCurrentPageConfig(config.pages, currentPageId);
    window.seafile = {
      ...window.seafile, // need docUuid
      ...appConfig,
      ...pageOptions,
      sdocServer,
      assetsUrl: assetsUrl || props.assets_url,
      accessToken: seadoc_access_token,
      serviceUrl: appConfig.serviceURL,
      assets_url: appConfig.assetsUrl,
      isWiki: true,
      isOpenSocket: window.seafile?.docUuid && true,
      publishUrl,
      wikiId,
      navConfig: config, // Reference assignment
      repos: repos,
      wikiSettings,
      isLocked: currentPageConfig?.locked,
      permission
    };
    return { ...props, docUuid: window.seafile.docUuid, currentPageConfig };
  }

  componentDidMount() {
    if (!wikiId) return;
    this.fetchCollaborators(wikiId);
    const eventBus = EventBus.getInstance();
    this.unsubscribeUnseenNotificationsCount = eventBus.subscribe(EXTERNAL_EVENT.UNSEEN_NOTIFICATIONS_COUNT, this.updateUnseenNotificationsCount);
    this.unsubscribeWikiFilePreview = eventBus.subscribe(EXTERNAL_EVENT.TRANSFER_PREVIEW_FILE_ID, this.toggleWikiFilePreview);
    this.unsubscribeGenerateExdrawReadOnlyLink = eventBus.subscribe(EXTERNAL_EVENT.GENERATE_EXDRAW_READ_ONLY_LINK, this.generateExdrawReadOnlyLink);
    document.addEventListener('keydown', this.handleGlobalKeyDown, true);
    this.scrollToHashAnchor();
  }

  componentWillUnmount() {
    this.unsubscribeUnseenNotificationsCount();
    this.unsubscribeWikiFilePreview();
    this.unsubscribeGenerateExdrawReadOnlyLink();
    document.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    if (this.hashScrollTimer) {
      clearTimeout(this.hashScrollTimer);
      this.hashScrollTimer = null;
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.docUuid !== this.state.docUuid) {
      this.setState({
        isShowRightPanel: false,
        isPreviewFile: false
      });
    }

    if (
      prevProps.editorContent !== this.props.editorContent ||
      prevProps.currentPageId !== this.props.currentPageId ||
      prevState.docUuid !== this.state.docUuid
    ) {
      this.scrollToHashAnchor();
    }
  }

  handleGlobalKeyDown = (event) => {
    // dispatch mod + f to trigger search and replace menu
    if (isHotkey('mod+f', event)) {
      event.preventDefault();
      event.stopPropagation();
      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EXTERNAL_EVENT.OPEN_SEARCH_REPLACE_MODAL);
    }
  };

  toggleWikiFilePreview = (data) => {
    this.setState({
      isPreviewFile: true,
      isReloadingPreview: true,
      previewDocUuid: {},
      isShowRightPanel: false
    });

    // Firstly get access token config and then use it to get wiki content
    const getWikiPage = wikiAPI.getWiki2Page(data.wiki_repo_id, data.page_id);
    getWikiPage.then(res => {
      const { seadoc_access_token, assets_url } = res.data;
      const docUuid = assets_url.slice(assets_url.lastIndexOf('/') + 1);
      const config = {
        docUuid,
        sdocServer: seadocServerUrl,
        accessToken: seadoc_access_token,
      };
      this.setState({ previewDocUuid: docUuid });

      const sdocServerApi = new SDocServerApi(config);
      sdocServerApi.getDocContent().then(docRes => {
        this.setState({
          docContent: docRes.data,
          isReloadingPreview: false,
          previewDocInfo: { pageId: data.page_id, config: this.props.config }
        });
      });
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
  };

  generateExdrawReadOnlyLink = (params) => {
    if (!params?.repoID || !params?.filePath) return;

    seafileAPI.getInternalLink(params.repoID, params?.filePath).then((res) => {
      const url = new URL(res.data.smart_link);
      url.searchParams.set('readonly', 'true');
      url.searchParams.set('filetype', 'Excalidraw');
      const link = url.toString();
      if (params?.onSuccess) {
        params?.onSuccess(link);
      }
    });
  };

  fetchCollaborators(wikiId) {
    metadataAPI.getCollaborators(wikiId).then(res => {
      const collaborators = Array.isArray(res?.data?.user_list)
        ? res.data.user_list.map(user => new User(user))
        : [];
      this.setState({ collaborators });
    });
  }

  togglePreview = () => {
    this.setState({ isPreviewFile: false });
  };

  getHashScrollTarget = () => {
    const rawHash = window.location.hash || '';
    if (!rawHash.startsWith('#')) {
      return '';
    }

    try {
      return decodeURIComponent(rawHash.slice(1));
    } catch (error) {
      return rawHash.slice(1);
    }
  };

  escapeSelectorValue = (value) => {
    if (window.CSS?.escape) {
      return window.CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
  };

  scrollToHashAnchor = () => {
    if (this.hashScrollTimer) {
      clearTimeout(this.hashScrollTimer);
      this.hashScrollTimer = null;
    }

    const hash = this.getHashScrollTarget();
    if (!hash || !this.scrollRef.current || !this.props.editorContent?.elements) {
      return;
    }

    let retryCount = 0;

    const tryScroll = () => {
      const scrollContainer = this.scrollRef.current;
      if (!scrollContainer) {
        return;
      }

      const escapedHash = this.escapeSelectorValue(hash);
      const target = scrollContainer.querySelector(`[data-id="${escapedHash}"]`) || scrollContainer.querySelector(`[id="${escapedHash}"]`);

      if (target) {
        scrollContainer.scrollTop = target.offsetTop - 10;
        this.hashScrollTimer = null;
        return;
      }

      if (retryCount >= HASH_SCROLL_MAX_RETRIES) {
        this.hashScrollTimer = null;
        return;
      }

      retryCount += 1;
      this.hashScrollTimer = setTimeout(tryScroll, HASH_SCROLL_RETRY_DELAY);
    };

    this.hashScrollTimer = setTimeout(tryScroll, HASH_SCROLL_DELAY);
  };

  updateUnseenNotificationsCount = (count) => {
    this.setState({ unseenNotificationsCount: count });
  };

  handleEditorStateChange = ({ pageId, locked }) => {
    this.forceUpdate();
  };

  openHistory = () => {
    window.location.href = `${siteRoot}wiki/file_revisions/${wikiId}/?page_id=${this.state.currentPageConfig.id}`;
  };

  exportPage = (exportType) => {
    const serviceUrl = window.app.config.serviceURL;
    const pageId = this.state.currentPageConfig.id;
    let exportPageUrl = serviceUrl + '/api/v2.1/wiki2/' + wikiId + '/page/' + pageId + '/export/?export_type=' + exportType;
    window.location.href = exportPageUrl;
  };

  exportAsSdoc = () => {
    this.exportPage('sdoc');
  };

  exportAsMarkdown = () => {
    this.exportPage('markdown');
  };

  toggleFreezeStatus = () => {
    this.props.updatePageLock(this.state.currentPageConfig.id, !this.props.currentPageLocked);
  };

  setIsShowRightPanel = () => {
    this.setState(prevState => ({
      isShowRightPanel: !prevState.isShowRightPanel,
      isPreviewFile: false
    }));
  };

  setEditor = (editor) => {
    this.setState({ editor: editor });
  };

  getMenuItems = () => {
    const { currentPageLocked } = this.props;
    const items = [];

    if (wikiPermission === 'rw' && this.state.currentPageConfig) {
      if (isPro) {
        items.push({
          key: 'freeze-page',
          label: gettext('Freeze page'),
          right_slot: (
            <Switch
              checked={currentPageLocked}
              disabled={false}
              size="small"
              className="freeze-document-switch"
              onChange={this.toggleFreezeStatus}
            />
          ),
          keepOpen: true,
          onClick: this.toggleFreezeStatus,
        });
      }
      items.push({
        key: 'History',
        label: gettext('History'),
        onClick: this.openHistory,
      });
      items.push({
        key: 'Export',
        label: gettext('Export'),
        children: [
          { key: 'ExportAsSdoc', label: gettext('Export as sdoc'), onClick: this.exportAsSdoc },
          { key: 'ExportAsMarkdown', label: gettext('Export as Markdown'), onClick: this.exportAsMarkdown },
        ],
      });
    }
    return items;
  };

  render() {
    const menuItems = this.getMenuItems();
    const isOpenSocket = window.seafile.isOpenSocket;
    const { permission, pathExist, isDataLoading, config, onUpdatePageConfig, isUpdateBySide, style, currentPageLocked, seadoc_access_token } = this.props;
    const { currentPageConfig = {} } = this.state;
    const isViewingFile = pathExist && !isDataLoading;
    const isReadOnly = currentPageLocked || !(permission === 'rw');
    return (
      <div className={classnames('wiki2-main-panel', { 'show-right-panel': this.state.isShowRightPanel || this.state.isPreviewFile })} style={style}>
        <div className='wiki2-main-panel-north'>
          <div className="d-flex align-items-center flex-fill o-hidden">
            <div className='wiki2-main-panel-north-content'>
              <Icon
                role="button"
                aria-label={gettext('Side Nav Menu')}
                onClick={this.props.mobileOpenSidePanel}
                symbol="menu"
                className="side-nav-toggle d-md-none"
              />
              <WikiTopNav
                config={config}
                currentPageId={this.props.currentPageId}
                currentPageLocked={currentPageLocked}
                setCurrentPage={this.props.setCurrentPage}
                toggleFreezeStatus={this.toggleFreezeStatus}
              />
              {isViewingFile &&
                <DocInfo key={this.props.currentPageId} initContext={true} />
              }
            </div>
          </div>
          <div className='d-flex align-items-center'>
            {menuItems.length > 0 && <CommentPlugin unseenNotificationsCount={this.state.unseenNotificationsCount} setIsShowRightPanel={this.setIsShowRightPanel} />}
            {menuItems.length > 0 && <WikiCollaboratorsOperation isOpenSocket={isOpenSocket} docUuid={this.state.docUuid} token={seadoc_access_token} />}
            <CustomDropdown
              target="wiki-more-operations"
              items={menuItems}
              className="wiki2-file-history-button"
              triggerClassName="wiki2-file-history-button"
              menuClassName="large"
            />
          </div>
        </div>
        <div className="main-panel-center">
          <div className={`cur-view-content ${isViewingFile ? 'o-hidden' : ''}`}>
            {!this.props.pathExist &&
              <div className="message err-tip">{gettext('Folder does not exist.')}</div>
            }
            {this.props.pathExist && this.props.isDataLoading && <Loading />}
            {isViewingFile && Utils.isSdocFile(this.props.path) && (
              <div className='sdoc-scroll-container' id='sdoc-scroll-container' ref={this.scrollRef}>
                <div className='wiki-editor-container'>
                  <RightHeader isUpdateBySide={isUpdateBySide} currentPageConfig={currentPageConfig} onUpdatePageConfig={onUpdatePageConfig} />
                  <SdocWikiEditor
                    document={this.props.editorContent}
                    docUuid={this.state.docUuid}
                    isWikiReadOnly={isReadOnly}
                    scrollRef={this.scrollRef}
                    collaborators={this.state.collaborators}
                    showComment={true}
                    isShowRightPanel={this.state.isShowRightPanel}
                    setEditor={this.setEditor}
                    mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
                  />
                </div>
              </div>
            )}
          </div>
          {this.state.isPreviewFile &&
            <WikiRightPanel
              docContent={this.state.docContent}
              previewDocUuid={this.state.previewDocUuid}
              setEditor={this.setEditor}
              togglePreview={this.togglePreview}
              isReloadingPreview={this.state.isReloadingPreview}
              previewDocInfo={this.state.previewDocInfo}
            />}
          {this.state.isShowRightPanel && (
            <ErrorBoundary>
              <CollaboratorsProvider collaborators={this.state.collaborators}>
                <PluginsProvider plugins={[]} showComment={true} setIsShowRightPanel={this.setIsShowRightPanel}>
                  <CommentContextProvider {... { editor: this.state.editor }}>
                    <RightPanel classname='in-wiki-editor' editor={this.state.editor} />
                  </CommentContextProvider>
                </PluginsProvider>
              </CollaboratorsProvider>
            </ErrorBoundary>
          )}
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
