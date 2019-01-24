import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, slug, siteRoot, username } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import WikiMarkdownViewer from '../../components/wiki-markdown-viewer';
import WikiDirListView from '../../components/wiki-dir-list-view/wiki-dir-list-view';

const propTypes = {
  permission: PropTypes.string,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  path: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFileState: PropTypes.bool.isRequired,
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
    window.location.href= siteRoot + 'lib/' + repoID + '/file' + this.props.filePath + '?mode=edit';
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
    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          {username && (
            <Fragment>
              <div className="cur-view-toolbar border-left-show">
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
        <div className="cur-view-container">
          <div className="cur-view-path">
            <div className="path-containter">
              {username &&
                <Fragment>
                  <a href={siteRoot + 'wikis/'} className="normal">{gettext('Wikis')}</a>
                  <span className="path-split">/</span>
                </Fragment>
              }
              <a href={siteRoot + 'wikis/' + slug} className="normal">{slug}</a>
              {this.renderNavPath}
            </div>
          </div>
          <div className="cur-view-content">
            {this.props.isViewFileState ?
              <WikiMarkdownViewer
                markdownContent={this.props.content}
                isFileLoading={this.props.isFileLoading}
                lastModified = {this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
                isWiki={true}
              /> :
              <WikiDirListView
                direntList={this.props.direntList}
                onDirentClick={this.props.onDirentClick} 
              />
            }
          </div>
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
