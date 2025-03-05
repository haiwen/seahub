import React from 'react';
import PropTypes from 'prop-types';
import Loading from '../../loading';
import DirFiles from '../dir-files';
import DirViews from '../dir-views';
import DirTags from '../dir-tags';
import DirOthers from '../dir-others';

import './index.css';

const propTypes = {
  currentPath: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  direntList: PropTypes.array,
  selectedDirentList: PropTypes.array.isRequired,
  currentNode: PropTypes.object,
  repoID: PropTypes.string.isRequired,
  navRate: PropTypes.number,
  inResizing: PropTypes.bool.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  getMenuContainerSize: PropTypes.func,
  updateDirent: PropTypes.func,
  updateTreeNode: PropTypes.func,
};

class DirColumnNav extends React.Component {

  stopTreeScrollPropagation = (e) => {
    e.stopPropagation();
  };

  render() {
    const {
      isTreeDataLoading, userPerm, treeData, repoID, currentPath, currentRepoInfo,
    } = this.props;
    const flex = this.props.navRate ? '0 0 ' + this.props.navRate * 100 + '%' : '0 0 25%';
    const select = this.props.inResizing ? 'none' : '';
    return (
      <div className="dir-content-nav" role="navigation" style={{ flex: (flex), userSelect: select }} onScroll={this.stopTreeScrollPropagation}>
        {isTreeDataLoading ? <Loading /> : (
          <>
            <DirFiles
              repoID={repoID}
              currentPath={currentPath}
              treeData={treeData}
              userPerm={userPerm}
              currentRepoInfo={currentRepoInfo}
              direntList={this.props.direntList}
              selectedDirentList={this.props.selectedDirentList}
              currentNode={this.props.currentNode}
              getMenuContainerSize={this.props.getMenuContainerSize}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
              onRenameNode={this.props.onRenameNode}
              onDeleteNode={this.props.onDeleteNode}
              onAddFileNode={this.props.onAddFileNode}
              onAddFolderNode={this.props.onAddFolderNode}
              onItemCopy={this.props.onItemCopy}
              onItemMove={this.props.onItemMove}
              onItemsMove={this.props.onItemsMove}
              updateDirent={this.props.updateDirent}
              updateTreeNode={this.props.updateTreeNode}
            />
            <DirViews repoID={repoID} currentPath={currentPath} userPerm={userPerm} currentRepoInfo={currentRepoInfo} />
            <DirTags repoID={repoID} currentPath={currentPath} userPerm={userPerm} currentRepoInfo={currentRepoInfo} />
            <DirOthers repoID={repoID} userPerm={userPerm} currentRepoInfo={currentRepoInfo} />
          </>
        )}
      </div>
    );
  }
}

DirColumnNav.defaultProps = {
  navRate: 0.25
};

DirColumnNav.propTypes = propTypes;

export default DirColumnNav;
