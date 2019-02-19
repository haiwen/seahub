import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, slug, siteRoot, username } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import WikiMarkdownViewer from '../../components/wiki-markdown-viewer';
import WikiDirListView from '../../components/wiki-dir-list-view/wiki-dir-list-view';
import Loading from '../../components/loading';

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
  }

  onEditClick = (e) => {
    e.preventDefault();
    let url = siteRoot + 'lib/' + repoID + '/file' + this.props.path + '?mode=edit';
    window.open(url);
  }

  onMainNavBarClick = (e) => {
    this.props.onMainNavBarClick(e.target.dataset.path);
  }

  renderNavPath = () => {
    let paths = this.props.path.split('/');
    let nodePath = '';
    let pathElem = paths.map((item, index) => {
      if (item === '') {
        return;
      } 
      if (index === (paths.length - 1)) {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        );
      } else {
        nodePath += '/' + item;
        return (
          <span key={index} >
            <span className="path-split">/</span>
            <a 
              className="path-link" 
              data-path={nodePath} 
              onClick={this.onMainNavBarClick}>
              {item}
            </a>
          </span>
        );
      }
    });
    return pathElem;
  }


  render() {
    const errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-north panel-top border-left-show">
          {username && (
            <Fragment>
              <div className="cur-view-toolbar">
                <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick}></span>
                {this.props.permission === 'rw' && (
                  <button className="btn btn-secondary operation-item" title="Edit File" onClick={this.onEditClick}>{gettext('Edit Page')}</button>
                )}
              </div>
              <CommonToolbar 
                repoID={repoID}
                onSearchedClick={this.props.onSearchedClick} 
                searchPlaceholder={gettext('Search files in this library')}
              />
            </Fragment>
          )}
        </div>
        <div className="main-panel-center">
          <div className="cur-view-path">
            <div className="path-containter">
              {username &&
                <Fragment>
                  <a href={siteRoot + 'wikis/'} className="normal">{gettext('Wikis')}</a>
                  <span className="path-split">/</span>
                </Fragment>
              }
              <a href={siteRoot + 'wikis/' + slug} className="normal">{slug}</a>
              {this.renderNavPath()}
            </div>
          </div>
          <div className="cur-view-content">
            {!this.props.pathExist && errMessage}
            {this.props.pathExist && this.props.isDataLoading && <Loading />}
            {(this.props.pathExist && !this.props.isDataLoading && this.props.isViewFile) && (
              <WikiMarkdownViewer
                markdownContent={this.props.content}
                isFileLoading={this.props.isDataLoading}
                lastModified = {this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
                isWiki={true}
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
