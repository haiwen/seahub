import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, repoID } from '../../utils/constants';
import Logo from '../../components/logo';
import Loading from '../../components/loading';
import TreeView from '../../components/tree-view/tree-view';
import IndexContentViewer from '../../components/index-viewer';

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

  onEditClick = (e) => {
    e.preventDefault();
    let indexNode = this.props.indexNode
    window.location.href= siteRoot + 'lib/' + repoID + '/file' + indexNode.path + '?mode=edit';
  }

  renderIndexView = () => {
    let indexNode = this.props.indexNode;
    return (
      <Fragment>
        <h3 className="wiki-pages-heading">
          {gettext('Contents')}
          {indexNode.object.permission === 'rw' && 
            <button className="btn btn-secondary operation-item index-edit" title="Edit Index" onClick={this.onEditClick}>{gettext('Edit')}</button>
          }
        </h3>
        <div className="wiki-pages-container">
          <IndexContentViewer
            indexContent={this.props.indexContent}
            onLinkClick={this.props.onLinkClick}
          />
        </div>
      </Fragment>
    );
  }

  renderTreeView = () => {
    return (
      <Fragment>
        <h3 className="wiki-pages-heading">{gettext('Pages')}</h3>
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
      </Fragment>
    )
  }

  render() {
    return (
      <div className={`side-panel wiki-side-panel ${this.props.closeSideBar ? '': 'left-zero'}`}>
        <div className="side-panel-top panel-top">
          <Logo onCloseSidePanel={this.props.onCloseSide} />
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          {this.props.isTreeDataLoading && <Loading /> }
          {!this.props.isTreeDataLoading && this.props.indexNode && this.renderIndexView() }
          {!this.props.isTreeDataLoading && !this.props.indexNode && this.renderTreeView() }
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
