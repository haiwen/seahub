import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID, slug, siteRoot } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import MarkdownViewer from '../../components/markdown-viewer';
import TreeDirView from '../../components/tree-dir-view/tree-dir-view';

const propTypes = {
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  permission: PropTypes.string,
  filePath: PropTypes.string.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isViewFileState: PropTypes.bool.isRequired,
  changedNode: PropTypes.object,
  onMenuClick: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  onMainNavBarClick: PropTypes.func.isRequired,
  onMainNodeClick: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      needOperationGroup: false
    };
  }

  onMenuClick = () => {
    this.props.onMenuClick();
  }

  onEditClick = (e) => {
    // const w=window.open('about:blank')
    e.preventDefault();
    window.location.href= siteRoot + 'lib/' + repoID + '/file' + this.props.filePath + '?mode=edit';
  }

  onMainNavBarClick = (e) => {
    this.props.onMainNavBarClick(e.target.dataset.path);
  }

  render() {

    let filePathList = this.props.filePath.split('/');
    let nodePath = '';
    let pathElem = filePathList.map((item, index) => {
      if (item === '') {
        return;
      } 
      if (index === (filePathList.length - 1)) {
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

    return (
      <div className="main-panel wiki-main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <div className="cur-view-toolbar border-left-show">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title="Side Nav Menu" onClick={this.onMenuClick}></span>
            { 
              this.props.permission === 'rw' && 
              <button className="btn btn-secondary operation-item" title="Edit File" onClick={this.onEditClick}>{gettext('Edit Page')}</button>
            }
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} searchPlaceholder={'Search files in this library'}/>
        </div>
        <div className="cur-view-container">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + 'wikis/'} className="normal">{gettext('Wikis')}</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wikis/' + slug} className="normal">{slug}</a>
              {pathElem}
            </div>
          </div>
          <div className="cur-view-content">
            { this.props.isViewFileState && 
              <MarkdownViewer
                markdownContent={this.props.content}
                latestContributor={this.props.latestContributor}
                lastModified = {this.props.lastModified}
                onLinkClick={this.props.onLinkClick}
                isFileLoading={this.props.isFileLoading}
              />
            }
            { !this.props.isViewFileState && 
              <TreeDirView node={this.props.changedNode} onMainNodeClick={this.props.onMainNodeClick} />
            }
          </div>
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
