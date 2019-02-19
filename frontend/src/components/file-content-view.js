import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import CommonToolbar from './toolbar/common-toolbar';
import ViewModeToolbar from './toolbar/view-mode-toolbar';
import CurDirPath from './cur-dir-path';
import WikiMarkdownViewer from './wiki-markdown-viewer';

const propTypes = {
  pathPrefix: PropTypes.array.isRequired,
  currentMode: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  hash: PropTypes.string,
  onTabNavClick: PropTypes.func.isRequired,
  onSideNavMenuClick: PropTypes.func.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  repoPermission: PropTypes.bool,
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
  goDraftPage: PropTypes.func.isRequired,
  reviewStatus: PropTypes.any,
  goReviewPage: PropTypes.func.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
};

class FileContentView extends React.Component {

  componentDidMount() {
    if (this.props.hash) {
      let hash = this.props.hash;
      setTimeout(function() {
        window.location.hash = hash;
      }, 500);
    }
  }

  switchViewMode = (mode) => {
    this.props.switchViewMode(mode);
  }

  render() {
    let repoID = this.props.repoID;
    console.log(this.props.filePermission);
    return (
      <div className={`main-panel o-hidden ${this.props.currentMode === 'column' ? 'dir-main-content' : ''}`}>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
            <div className="dir-operation">
              {(this.props.filePermission && !this.props.hasDraft ) && (
                <Fragment>
                  <button className="btn btn-secondary operation-item" title={gettext('Edit File')} onClick={this.onEditClick}>{gettext('Edit')}</button>
                </Fragment>
              )}

              {(this.props.filePermission && !this.props.isDraft && !this.props.hasDraft) && (
                <button className="btn btn-secondary operation-item" title={gettext('New Draft')} onClick={this.onNewDraft}>{gettext('New Draft')}</button>
              )}

            </div>
            <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.switchViewMode}/>
          </div>
          <CommonToolbar repoID={repoID} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              {this.props.currentRepoInfo && (
                <CurDirPath 
                  repoID={repoID}
                  repoName={this.props.currentRepoInfo.repo_name}
                  pathPrefix={this.props.pathPrefix}
                  currentPath={this.props.path} 
                  permission={this.props.repoPermission} 
                  onPathClick={this.props.onMainNavBarClick}
                  onTabNavClick={this.props.onTabNavClick}
                  isViewFile={true}
                />
              )}
            </div>
            <div className="cur-view-content">
              <WikiMarkdownViewer
                isFileLoading={this.props.isFileLoading}
                markdownContent={this.props.content}
                lastModified = {this.props.lastModified}
                latestContributor={this.props.latestContributor}
                onLinkClick={this.props.onLinkClick}
              >
                <Fragment>
                  {this.props.reviewStatus === 'open' &&
                    <div className='seafile-btn-view-review text-center'>
                      <div className='tag tag-green'> 
                        {gettext('This file is in review stage')}
                        <span className="ml-2" onClick={this.goReviewPage}>{gettext('View Review')}</span>
                      </div>
                    </div>
                  }
                  {(this.props.reviewStatus !== 'open' && !this.props.isDraft && this.props.hasDraft) &&
                    <div className='seafile-btn-view-review text-center'>
                      <div className='tag tag-green'>
                        {gettext('This file is in draft stage.')}
                        <span className="ml-2" onClick={this.goDraftPage}>{gettext('Edit Draft')}</span>
                      </div>
                    </div>
                  }
                </Fragment>
              </WikiMarkdownViewer>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

FileContentView.propTypes = propTypes;

export default FileContentView;
