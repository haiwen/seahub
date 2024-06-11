import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SdocWikiViewer } from '@seafile/sdoc-editor';
import { gettext, username } from '../../utils/constants';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import Account from '../../components/common/account';
import WikiTopNav from './top-nav';

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
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      docUuid: '',
    };
  }

  static getDerivedStateFromProps(props, state) {
    const { seadoc_access_token } = props;
    const config = window.app.config;
    const pageOptions = window.app.pageOptions;
    const { assetsUrl, seadocServerUrl: sdocServer, } = window.wiki.config;
    window.seafile = {
      ...window.seafile, // need docUuid
      ...config,
      ...pageOptions,
      sdocServer,
      assetsUrl: assetsUrl || props.assets_url,
      accessToken: seadoc_access_token,
      serviceUrl: config.serviceURL,
      assets_url: config.assetsUrl,
    };
    return { ...props, docUuid: window.seafile.docUuid };
  }

  render() {
    const { permission, pathExist, isDataLoading, isViewFile } = this.props;
    const isViewingFile = pathExist && !isDataLoading && isViewFile;
    const isReadOnly = !(permission === 'rw');
    return (
      <div className="wiki2-main-panel">
        <div className='wiki2-main-panel-north'>
          <WikiTopNav
            config={this.props.config}
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
