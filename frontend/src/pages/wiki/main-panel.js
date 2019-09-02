import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, slug, siteRoot, username } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import WikiMarkdownViewer from '../../components/wiki-markdown-viewer';
import WikiDirListView from '../../components/wiki-dir-list-view/wiki-dir-list-view';
import Loading from '../../components/loading';
import { Utils } from '../../utils/utils';
import Search from '../../components/search/search';

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
    let path = Utils.getEventData(e, 'path');
    this.props.onMainNavBarClick(path);
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
  }


  render() {
    const errMessage = (<div className="message err-tip">{gettext('Folder does not exist.')}</div>);
    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className={`main-panel-north panel-top ${this.props.permission === 'rw' ? 'border-left-show' : ''}`}>
          {!username &&
            <Fragment>
              <div className="cur-view-toolbar">
                <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick}></span>
              </div>
              <div className="common-toolbar">
                <Search
                  isPublic={true}
                  repoID={repoID}
                  onSearchedClick={this.props.onSearchedClick}
                  placeholder={gettext('Search files in this library')}
                />
              </div>
            </Fragment>
          }
          {username && (
            <Fragment>
              <div className="cur-view-toolbar">
                <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick}></span>
                {this.props.permission == 'rw' && (
                  Utils.isDesktop() ?
                    <button className="btn btn-secondary operation-item" title={gettext('Edit')} onClick={this.onEditClick}>{gettext('Edit')}</button> :
                    <span className="fa fa-pencil-alt mobile-toolbar-icon" title={gettext('Edit')} onClick={this.onEditClick} style={{'font-size': '1.1rem'}}></span>
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
            <div className="path-container">
              <a href={siteRoot + 'published/' + slug} className="normal">{slug}</a>
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
                path={this.props.path}
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
