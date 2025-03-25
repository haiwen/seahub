import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { SdocWikiEditor, DocInfo } from '@seafile/sdoc-editor';
import { gettext, username, wikiPermission, wikiId, siteRoot } from '../../utils/constants';
import TextTranslation from '../../utils/text-translation';
import Switch from '../../components/switch';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';
import WikiTopNav from './top-nav';
import { getCurrentPageConfig } from './utils';
import RightHeader from './wiki-right-header';


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
  updatePageLockedToServer: PropTypes.func,
  currentPageLocked: PropTypes.bool,
  onAddWikiPage: PropTypes.func,
  style: PropTypes.object.isRequired,
  mobileOpenSidePanel: PropTypes.func.isRequired
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      docUuid: '',
      currentPageConfig: {},
      isDropdownMenuOpen: false,
    };
    this.scrollRef = React.createRef();
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
      const { HISTORY, FREEZE_DOCUMENT } = TextTranslation;
      list.push(FREEZE_DOCUMENT);
      list.push(HISTORY);
    }
    return list;
  };

  onMenuItemClick = (item) => {
    const { key } = item;
    switch (key) {
      case 'History':
        this.openHistory();
        break;
    }
  };

  onMenuItemKeyDown = (e, item) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(item);
    }
  };

  toggleFreezeStatus = () => {
    this.props.updatePageLockedToServer(this.state.currentPageConfig.id, !this.props.currentPageLocked);
  };

  render() {
    const menuItems = this.getMenu();
    const { permission, pathExist, isDataLoading, config, onUpdatePage, isUpdateBySide, style, currentPageLocked } = this.props;
    const { currentPageConfig = {}, isDropdownMenuOpen } = this.state;
    const isViewingFile = pathExist && !isDataLoading;
    const isReadOnly = currentPageLocked || !(permission === 'rw');
    return (
      <div className="wiki2-main-panel" style={style}>
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
                currentPageConfig={currentPageConfig}
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
            {menuItems.length > 0 &&
            <Dropdown isOpen={isDropdownMenuOpen} toggle={this.toggleDropdownMenu} className='wiki2-file-history-button'>
              <DropdownToggle
                tag="i"
                id="cur-folder-more-op-toggle"
                className='wiki2-file-history-button sf3-font-more sf3-font'
                data-toggle="dropdown"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                aria-expanded={isDropdownMenuOpen}
              >
              </DropdownToggle>
              <DropdownMenu>
                {menuItems.map((menuItem, index) => {
                  if (menuItem.key === 'Freeze Document') {
                    return <Switch
                      checked={currentPageLocked}
                      disabled={false}
                      size="small"
                      textPosition="left"
                      className='freeze-document-switch w-100 dropdown-item'
                      onChange={this.toggleFreezeStatus}
                      placeholder={gettext('Freeze Document')}
                    />;
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
            {username && <Account />}
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
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
