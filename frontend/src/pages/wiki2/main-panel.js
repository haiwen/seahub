import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SdocWikiViewer } from '@seafile/sdoc-editor';
import { Input } from 'reactstrap';
import { gettext, username } from '../../utils/constants';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';
import WikiTopNav from './top-nav';
import { getCurrentPageConfig } from './utils';

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
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      docUuid: '',
      currentPageConfig: {},
    };
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
    };
    const currentPageConfig = getCurrentPageConfig(config.pages, currentPageId)
    return { ...props, docUuid: window.seafile.docUuid, currentPageConfig };
  }

  handleRenameDocument = (e) => {
    const newName = e.target.value.trim()
    const { currentPageConfig } = this.state
    const { id, name, icon } = currentPageConfig
    if (newName === name) return;
    const pageConfig = { name: newName, icon }
    this.props.onUpdatePage(id, pageConfig)
    // Reset title if name is empty
    if (!newName) e.target.value = name;
  }

  render() {
    const { permission, pathExist, isDataLoading, isViewFile, config } = this.props;
    const { currentPageConfig } = this.state
    const isViewingFile = pathExist && !isDataLoading && isViewFile;
    const isReadOnly = !(permission === 'rw');

    return (
      <div className="wiki2-main-panel">
        <div className='wiki2-main-panel-north'>
          <WikiTopNav
            config={config}
            currentPageId={this.props.currentPageId}
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
              <div>
                <SdocWikiViewer
                  document={this.props.editorContent}
                  docUuid={this.state.docUuid}
                  isWikiReadOnly={isReadOnly}
                  topSlot={<Input className='sf-wiki-title' bsSize="lg" onChange={this.handleRenameDocument} defaultValue={currentPageConfig.name} />}
                />
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