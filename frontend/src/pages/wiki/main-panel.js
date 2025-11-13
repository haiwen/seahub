import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, siteRoot, username, isPro } from '../../utils/constants';
import SeafileMarkdownViewer from '../../components/seafile-markdown-viewer';
import WikiDirListView from '../../components/wiki-dir-list-view/wiki-dir-list-view';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import Search from '../../components/search/search';
import Notification from '../../components/common/notification';
import Account from '../../components/common/account';
import SdocWikiPageViewer from '../../components/sdoc-wiki-page-viewer';
import Icon from '../../components/icon';

const propTypes = {
  path: PropTypes.string.isRequired,
  pathExist: PropTypes.bool.isRequired,
  isViewFile: PropTypes.bool.isRequired,
  isDataLoading: PropTypes.bool.isRequired,
  content: PropTypes.string,
  permission: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  direntList: PropTypes.array.isRequired,
  onMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
};

class MainPanel extends Component {

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


  render() {
    let { onSearchedClick } = this.props;
    const errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
    const isViewingFile = this.props.pathExist && !this.props.isDataLoading && this.props.isViewFile;
    return (
      <div className="main-panel wiki-main-panel">
        <div className="main-panel-hide hide">{this.props.content}</div>
        <div className={`main-panel-north panel-top ${this.props.permission === 'rw' ? 'border-left-show' : ''}`}>
          {!username &&
            <Fragment>
              <div className="cur-view-toolbar">
                <Icon symbol="menu" className="hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick} />
              </div>
              <div className="common-toolbar">
                {isPro && (
                  <Search isPublic={true} repoID={repoID} onSearchedClick={onSearchedClick} placeholder={gettext('Search files')}/>
                )}
              </div>
            </Fragment>
          }
          {username && (
            <Fragment>
              <div className="cur-view-toolbar">
                <Icon symbol="menu" className="hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick} />
                {this.props.permission == 'rw' && (
                  Utils.isDesktop() ?
                    <button className="btn btn-secondary operation-item" title={gettext('Edit')} onClick={this.onEditClick}>{gettext('Edit')}</button> :
                    <Icon symbol="rename" className="mobile-toolbar-icon" title={gettext('Edit')} onClick={this.onEditClick} />
                )}
              </div>
              <div className="common-toolbar">
                {isPro && (
                  <Search isPublic={true} repoID={repoID} onSearchedClick={onSearchedClick} placeholder={gettext('Search files')}/>
                )}
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
            {isViewingFile && Utils.isMarkdownFile(this.props.path) && (
              <SeafileMarkdownViewer
                isWiki={true}
                path={this.props.path}
                repoID={repoID}
                isTOCShow={false}
                markdownContent={this.props.content}
                isFileLoading={this.props.isDataLoading}
                lastModified = {this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
              />
            )}
            {isViewingFile && Utils.isSdocFile(this.props.path) && (
              <SdocWikiPageViewer
                isWiki={true}
                path={this.props.path}
                repoID={repoID}
                markdownContent={this.props.content}
                isFileLoading={this.props.isDataLoading}
                lastModified = {this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
              />
            )}
            {(!this.props.isDataLoading && !this.props.isViewFile) && (
              <WikiDirListView
                path={this.props.path}
                direntList={this.props.direntList}
                onDirentClick={this.props.onDirentClick}
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
