import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, repoID, slug, username, permission, mediaUrl } from '../../utils/constants';
import Loading from '../../components/loading';
import TreeView from '../../components/tree-view/tree-view';
import IndexMdViewer from './index-md-viewer';

const propTypes = {
  closeSideBar: PropTypes.bool.isRequired,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  indexNode: PropTypes.object,
  indexContent: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onCloseSide: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  config: PropTypes.object.isRequired,
};

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.isNodeMenuShow = false;
    const paths = window.location.pathname.split('/');
    const index = paths.indexOf('wiki-edit') + 1;
    this.libName = paths[index] || 'Wiki';
  }

  renderIndexView = () => {
    return (
      <div className="wiki-pages-container">
        <div style={{marginTop: '2px'}}></div>
        <IndexMdViewer
          indexContent={this.props.indexContent}
          onLinkClick={this.props.onLinkClick}
        />
      </div>
    );
  };

  renderTreeView = () => {
    return (
      <div className="wiki-pages-container">
        {this.props.treeData && (
          <TreeView
            treeData={this.props.treeData}
            currentPath={this.props.currentPath}
            isNodeMenuShow={this.isNodeMenuShow}
            onNodeClick={this.props.onNodeClick}
            onNodeCollapse={this.props.onNodeCollapse}
            onNodeExpanded={this.props.onNodeExpanded}
          />
        )}
      </div>
    );
  };

  render() {
    const { wiki_name, wiki_icon } = this.props.config;
    const name = wiki_name || this.libName;
    const src = wiki_icon && wiki_icon === 'default' ? `${mediaUrl}img/wiki/default.png` : wiki_icon;
    return (
      <div className={`side-panel wiki-side-panel ${this.props.closeSideBar ? '': 'left-zero'}`}>
        <div className="side-panel-top panel-top">
          {wiki_icon && <img src={src} width="32" alt='' className='mr-2' />}
          <h4 className="ml-0 mb-0">{name}</h4>
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          {this.props.isTreeDataLoading && <Loading /> }
          {!this.props.isTreeDataLoading && this.props.indexNode && this.renderIndexView() }
          {!this.props.isTreeDataLoading && !this.props.indexNode && this.renderTreeView() }
          {(username && permission) && (
            <div className="text-left p-2">
              <a href={siteRoot + 'library/' + repoID + '/' + slug + '/'} className="text-dark text-decoration-underline">
                {gettext('Go to Library')}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
