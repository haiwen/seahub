import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Logo from '../../components/logo';
import Loading from '../../components/loading';
import TreeView from '../../components/tree-view-2/tree-view';
import IndexContentViewer from '../../components/index-viewer';

const propTypes = {
  closeSideBar: PropTypes.bool.isRequired,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  onCloseSide: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
};

const INDEX_PATH = '/index.md';

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isFileLoading: true,
      currentNode: null,
      indexContent: '',
      indexNode: null,
    };
    this.isNodeMenuShow = false;
  }

  componentDidMount() {
    let treeData = this.props.treeData;
    let indexNode = treeData.getNodeByPath(INDEX_PATH);
    if (indexNode && !indexNode.object.isDir()) {
      this.loadIndexFile(indexNode);
    } else {
      this.setState({isFileLoading: false});
    }
  }

  componentWillReceiveProps(nextProps) {
    // todo
  }

  loadIndexFile = (indexNode) => {
    this.setState({isFileLoading: true});
    seafileAPI.getFileDownloadLink(repoID, indexNode.path).then(res => {
      seafileAPI.getFileContent(res.data).then(res => {
        this.setState({
          isFileLoading: false,
          indexContent: res.data,
          indexNode: indexNode,
        });
      });
    });
  }

  onEditClick = (e) => {
    e.preventDefault();
    window.location.href= siteRoot + 'lib/' + repoID + '/file' + INDEX_PATH + '?mode=edit';
  }

  renderIndexView = () => {
    let indexNode = this.state.indexNode;
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
            indexContent={this.state.indexContent}
            onLinkClick={this.props.onLinkClick}
            onContentRendered={this.onContentRendered}
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
          {this.state.isFileLoading && <Loading /> }
          {!this.state.isFileLoading && this.state.indexNode && this.renderIndexView() }
          {!this.state.isFileLoading && !this.state.indexNode && this.renderTreeView() }
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
