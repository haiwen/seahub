import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { SdocWikiEditor, DocInfo, ErrorBoundary, EXTERNAL_EVENT } from '@seafile/seafile-sdoc-editor';
import { CollaboratorsProvider, CommentContextProvider, EventBus, PluginsProvider, RightPanel } from '@seafile/sdoc-editor';
import { gettext, wikiPermission, wikiId, siteRoot, isPro, seadocServerUrl } from '../../utils/constants';
import TextTranslation from '../../utils/text-translation';
import Switch from '../../components/switch';
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
  onUpdatePage: PropTypes.func,
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
      isDropdownMenuOpen: false,
      showExportSubmenu: false,
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
    this.exportDropdownRef = React.createRef();
  }

  static getDerivedStateFromProps(props, state) {
    const { seadoc_access_token, currentPageId, config } = props;
    const appConfig = window.app.config;
    const pageOptions = window.app.pageOptions;
    const { assetsUrl, seadocServerUrl: sdocServer, publishUrl } = window.wiki.config;
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
    };
    const currentPageConfig = getCurrentPageConfig(config.pages, currentPageId);
    return { ...props, docUuid: window.seafile.docUuid, currentPageConfig };
  }

  componentDidMount() {
    if (!wikiId) return;
    this.fetchCollaborators(wikiId);
    const eventBus = EventBus.getInstance();
    this.unsubscribeUnseenNotificationsCount = eventBus.subscribe(EXTERNAL_EVENT.UNSEEN_NOTIFICATIONS_COUNT, this.updateUnseenNotificationsCount);
    this.unsubscribeWikiFilePreview = eventBus.subscribe(EXTERNAL_EVENT.TRANSFER_PREVIEW_FILE_ID, this.toggleWikiFilePreview);
  }

  componentWillUnmount() {
    this.unsubscribeUnseenNotificationsCount();
    this.unsubscribeWikiFilePreview();
  }

  componentDidUpdate(prevState) {
    if (prevState.docUuid !== this.state.docUuid) {
      this.setState({ isShowRightPanel: false, isPreviewFile: false });
    }
  }

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
          previewDocInfo: { pageId: data.page_id, config: this.props.config}
        });
      });
    }).catch(error => {
      console.error(error);
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
  }

  updateUnseenNotificationsCount = (count) => {
    this.setState({ unseenNotificationsCount: count });
  };

  handleEditorStateChange = ({ pageId, locked }) => {
    this.forceUpdate();
  };

  openHistory = () => {
    window.location.href = `${siteRoot}wiki/file_revisions/${wikiId}/?page_id=${this.state.currentPageConfig.id}`;
  };

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  getMenu = () => {
    const list = [];
    if (wikiPermission === 'rw' && this.state.currentPageConfig) {
      const { HISTORY, FREEZE_PAGE, EXPORT_PAGE } = TextTranslation;
      if (isPro) {
        list.push(FREEZE_PAGE);
      }
      list.push(HISTORY);
      list.push(EXPORT_PAGE);
    }
    return list;
  };

  onMenuItemClick = (item) => {
    const { key } = item;
    switch (key) {
      case 'History':
        this.openHistory();
        break;
      case 'ExportAsSdoc':
        this.exportAsSdoc();
        break;
      case 'ExportAsMarkdown':
        this.exportAsMarkdown();
        break;
    }
  };

  exportPage = (exportType) => {
    const serviceUrl = window.app.config.serviceURL;
    const pageId = this.state.currentPageConfig.id;
    let exportPageUrl = serviceUrl + '/api/v2.1/wiki2/' + wikiId + '/page/' + pageId + '/export/?export_type=' + exportType;
    window.location.href = exportPageUrl;
    this.setState({ showExportSubmenu: false });
  };

  exportAsSdoc = () => {
    this.exportPage('sdoc');
  };

  exportAsMarkdown = () => {
    this.exportPage('markdown');
  };

  onMenuItemKeyDown = (e, item) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(item);
    }
  };

  toggleFreezeStatus = () => {
    this.props.updatePageLock(this.state.currentPageConfig.id, !this.props.currentPageLocked);
  };

  showExportSubmenu = () => {
    this.setState({ showExportSubmenu: true });
  };

  hideExportSubmenu = () => {
    this.setState({ showExportSubmenu: false });
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

  render() {
    const menuItems = this.getMenu();
    const { permission, pathExist, isDataLoading, config, onUpdatePage, isUpdateBySide, style, currentPageLocked } = this.props;
    const { currentPageConfig = {}, isDropdownMenuOpen, showExportSubmenu } = this.state;
    const isViewingFile = pathExist && !isDataLoading;
    const isReadOnly = currentPageLocked || !(permission === 'rw');
    return (
      <div className={classnames('wiki2-main-panel', { 'show-right-panel': this.state.isShowRightPanel || this.state.isPreviewFile })} style={style}>
        <div className='wiki2-main-panel-north'>
          <div className="d-flex align-items-center flex-fill o-hidden">
            <div className='wiki2-main-panel-north-content'>
              <i
                role="button"
                aria-label={gettext('Side Nav Menu')}
                onClick={this.props.mobileOpenSidePanel}
                className="sf2-icon-menu side-nav-toggle d-md-none"
              >
              </i>
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
            {menuItems.length > 0 &&
            <Dropdown isOpen={isDropdownMenuOpen} toggle={this.toggleDropdownMenu} className='wiki2-file-history-button'>
              <DropdownToggle
                tag="span"
                role="button"
                id="cur-folder-more-op-toggle"
                className='wiki2-file-history-button'
                data-toggle="dropdown"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                aria-expanded={isDropdownMenuOpen}
              >
                <span className="sf3-font-more sf3-font" aria-hidden="true"></span>
              </DropdownToggle>
              <DropdownMenu>
                {menuItems.map((menuItem, index) => {
                  if (menuItem.key === 'Freeze page') {
                    return <Switch
                      key={index}
                      checked={currentPageLocked}
                      disabled={false}
                      size="small"
                      textPosition="left"
                      className='freeze-document-switch w-100 dropdown-item'
                      onChange={this.toggleFreezeStatus}
                      placeholder={gettext('Freeze page')}
                    />;
                  } else if (menuItem.key === 'Export') {
                    return (
                      <div
                        key={index}
                        className="position-relative"
                        onMouseEnter={this.showExportSubmenu}
                        onMouseLeave={this.hideExportSubmenu}
                        ref={this.exportDropdownRef}
                      >
                        <DropdownItem className="d-flex justify-content-between align-items-center">
                          <span>{menuItem.value}</span>
                          <i className="fas fa-caret-right ml-2"></i>
                        </DropdownItem>
                        {showExportSubmenu && (
                          <div
                            className="dropdown-menu show"
                            style={{
                              position: 'absolute',
                              left: 'auto',
                              right: '100%',
                              top: 0,
                              marginTop: 0,
                              marginRight: '0'
                            }}
                          >
                            <DropdownItem onClick={this.exportAsSdoc}>
                              {gettext('Export as sdoc')}
                            </DropdownItem>
                            <DropdownItem onClick={this.exportAsMarkdown}>
                              {gettext('Export as Markdown')}
                            </DropdownItem>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <DropdownItem
                        key={index}
                        onClick={this.onMenuItemClick.bind(this, menuItem)}
                        onKeyDown={this.onMenuItemKeyDown.bind(this, menuItem)}
                      >{menuItem.value}
                      </DropdownItem>
                    );
                  }
                })}
              </DropdownMenu>
            </Dropdown>
            }
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
                  <RightHeader isUpdateBySide={isUpdateBySide} currentPageConfig={currentPageConfig} onUpdatePage={onUpdatePage} />
                  <SdocWikiEditor
                    document={this.props.editorContent}
                    docUuid={this.state.docUuid}
                    isWikiReadOnly={isReadOnly}
                    scrollRef={this.scrollRef}
                    collaborators={this.state.collaborators}
                    showComment={true}
                    isShowRightPanel={this.state.isShowRightPanel}
                    setEditor={this.setEditor}
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
