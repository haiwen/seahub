import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { SdocWikiViewer } from '@seafile/sdoc-editor';
import { gettext, repoID, siteRoot, username, isEditWiki } from '../../utils/constants';
import SeafileMarkdownViewer from '../../components/seafile-markdown-viewer';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
// import Search from '../../components/search/search';
import Notification from '../../components/common/notification';
import Account from '../../components/common/account';

import './wiki.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  isViewFile: PropTypes.bool.isRequired,
  isDataLoading: PropTypes.bool.isRequired,
  content: PropTypes.string,
  permission: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  can_edit_file: PropTypes.bool,
  seadoc_access_token: PropTypes.string,
  assets_url: PropTypes.string,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);

    this.state = {
      docUuid: '',
    };
  }

  onMenuClick = () => {
    this.props.onMenuClick();
  };

  onEditClick = (e) => {
    e.preventDefault();
    let url = siteRoot + 'lib/' + repoID + '/file' + this.props.path + '?mode=edit';
    window.open(url);
  };

  onMainNavBarClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onMainNavBarClick(path);
  };

  renderNavPath = () => {
    let paths = this.props.path.split('/');
    let nodePath = '';
    let pathElem = paths.map((item, index) => {
      if (item === '') {
        return null;
      }
      if (index === (paths.length - 1)) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <span className="path-file-name">{item}</span>
          </Fragment>
        );
      } else {
        nodePath += '/' + item;
        return (
          <Fragment key={index} >
            <span className="path-split">/</span>
            <a
              className="path-link"
              data-path={nodePath}
              onClick={this.onMainNavBarClick}>
              {item}
            </a>
          </Fragment>
        );
      }
    });
    return pathElem;
  };

  static getDerivedStateFromProps(props, state) {
    const { can_edit_file, seadoc_access_token } = props;
    const config = window.app.config;
    const pageOptions = window.app.pageOptions;
    const { assetsUrl, seadocServerUrl: sdocServer, } = window.wiki.config;
    window.seafile = {
      ...window.seafile, // need docUuid
      ...config,
      ...pageOptions,
      sdocServer,
      assetsUrl: assetsUrl || props.assets_url,
      can_edit_file,
      accessToken: seadoc_access_token,
      serviceUrl: config.serviceURL,
      assets_url: config.assetsUrl,
    };
    return { ...props, docUuid: window.seafile.docUuid };
  }

  render() {
    const errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
    const { content, permission, pathExist, isDataLoading, isViewFile } = this.props;
    const isViewingFile = pathExist && !isDataLoading && isViewFile;
    const editorContent = content && JSON.parse(content);
    const isReadOnly = permission.indexOf('w') === -1 || !window.seafile.can_edit_file;
    return (
      <div className="main-panel wiki-main-panel" style={{ flex: isEditWiki ? '1 0 76%' : '1 0 80%' }}>
        <div className="main-panel-hide hide">{this.props.content}</div>
        <div className={`main-panel-north panel-top ${this.props.permission === 'rw' ? 'border-left-show' : ''}`}>
          {!username &&
            <Fragment>
              <div className="cur-view-toolbar">
                <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick}></span>
                {this.props.permission == 'rw' && (
                  Utils.isDesktop() ?
                    <button className="btn btn-secondary operation-item" title={gettext('Edit')} onClick={this.onEditClick}>{gettext('Edit')}</button> :
                    <span className="fa fa-pencil-alt mobile-toolbar-icon" title={gettext('Edit')} onClick={this.onEditClick} style={{ 'fontSize': '1.1rem' }}></span>
                )}
              </div>
              <div className="common-toolbar">
                {/* {isPro && (
                  <Search isPublic={true} repoID={repoID} onSearchedClick={onSearchedClick} placeholder={gettext('Search files')}/>
                )} */}
              </div>
            </Fragment>
          }
          {username && (
            <Fragment>
              <div className="cur-view-toolbar">
                <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick}></span>
              </div>
              <div className="common-toolbar">
                {/* {isPro && (
                  <Search isPublic={true} repoID={repoID} onSearchedClick={onSearchedClick} placeholder={gettext('Search files')}/>
                )} */}
                <Notification />
                <Account />
              </div>
            </Fragment>
          )}
        </div>
        <div className="main-panel-center">
          <div className={`cur-view-content ${isViewingFile ? 'o-hidden' : ''}`}>
            {!this.props.pathExist && errMessage}
            {this.props.pathExist && this.props.isDataLoading && <Loading />}
            {/* {isViewingFile && Utils.isMarkdownFile(this.props.path) && (
              <SeafileMarkdownViewer
                isWiki={true}
                path={this.props.path}
                repoID={repoID}
                markdownContent={content}
                isFileLoading={this.props.isDataLoading}
                lastModified={this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
              />
            )} */}
            {isViewingFile && Utils.isSdocFile(this.props.path) && (
              <SdocWikiViewer
                document={editorContent}
                showOutline={false}
                showToolbar={false}
                docUuid={this.state.docUuid}
                isWikiReadOnly={isReadOnly}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
