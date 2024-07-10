import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SdocWikiEditor } from '@seafile/sdoc-editor';
import { gettext, username } from '../../utils/constants';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';
import WikiTopNav from './top-nav';
import { getCurrentPageConfig } from './utils';
import RightHeader from './wiki-right-header';

const propTypes = {
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  isViewFile: PropTypes.bool.isRequired,
  isDataLoading: PropTypes.bool.isRequired,
  editorContent: PropTypes.object,
  permission: PropTypes.string,
  seadoc_access_token: PropTypes.string,
  assets_url: PropTypes.string,
  config: PropTypes.object,
  currentPageId: PropTypes.string,
  onUpdatePage: PropTypes.func,
  onAddWikiPage: PropTypes.func,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      docUuid: '',
      currentPageConfig: {},
    };
    this.scrollRef = React.createRef();
  }

  static getDerivedStateFromProps(props, state) {
    const { seadoc_access_token, currentPageId, config } = props;
    const appConfig = window.app.config;
    const pageOptions = window.app.pageOptions;
    const { assetsUrl, seadocServerUrl: sdocServer, } = window.wiki.config;
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
    };
    const currentPageConfig = getCurrentPageConfig(config.pages, currentPageId);
    return { ...props, docUuid: window.seafile.docUuid, currentPageConfig };
  }

  render() {
    const { permission, pathExist, isDataLoading, isViewFile, config, onUpdatePage } = this.props;
    const { currentPageConfig = {}, } = this.state;
    const isViewingFile = pathExist && !isDataLoading && isViewFile;
    const isReadOnly = !(permission === 'rw');

    return (
      <div className="wiki2-main-panel">
        <div className='wiki2-main-panel-north'>
          <WikiTopNav
            config={config}
            currentPageId={this.props.currentPageId}
            currentPageConfig={currentPageConfig}
          />
          {username &&
            <Account />
          }
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
                  <RightHeader onUpdatePage={onUpdatePage} currentPageConfig={currentPageConfig} />
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
