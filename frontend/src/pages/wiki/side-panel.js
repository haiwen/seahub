import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, repoID, slug, username, permission } from '../../utils/constants';
import Logo from '../../components/logo';
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
};

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.isNodeMenuShow = false;
  }

  renderIndexView = () => {
    return (
      <div className="wiki-pages-container">
        <div style={{ marginTop: '2px' }}></div>
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
    return (
      <div className={`side-panel wiki-side-panel ${this.props.closeSideBar ? '' : 'left-zero'}`}>
        <div className="side-panel-top panel-top">
          <Logo onCloseSidePanel={this.props.onCloseSide} />
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          {this.props.isTreeDataLoading && <Loading /> }
          {!this.props.isTreeDataLoading && this.props.indexNode && this.renderIndexView() }
          {!this.props.isTreeDataLoading && !this.props.indexNode && this.renderTreeView() }
          {(username && permission) && <div className="p-2"><a href={siteRoot + 'library/' + repoID + '/' + slug + '/'} className="text-dark text-decoration-underline">{gettext('Go to Library')}</a></div>}
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
