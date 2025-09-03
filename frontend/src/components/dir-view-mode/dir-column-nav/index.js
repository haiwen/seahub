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
  showMdView: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  direntList: PropTypes.array,
  currentNode: PropTypes.object,
  repoID: PropTypes.string.isRequired,
  navRate: PropTypes.number,
  inResizing: PropTypes.bool.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  getMenuContainerSize: PropTypes.func,
  updateDirent: PropTypes.func,
  updateTreeNode: PropTypes.func,
  updateRepoInfo: PropTypes.func,
  sortTreeNode: PropTypes.func,
};

class DirColumnNav extends React.Component {

  stopTreeScrollPropagation = (e) => {
    e.stopPropagation();
  };

  render() {
    const {
      isTreeDataLoading, userPerm, treeData, repoID, currentPath, currentRepoInfo, navRate = 0.25
    } = this.props;
    const flex = navRate ? '0 0 ' + navRate * 100 + '%' : '0 0 25%';
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
              currentNode={this.props.currentNode}
              eventBus={this.props.eventBus}
              getMenuContainerSize={this.props.getMenuContainerSize}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
              onRenameNode={this.props.onRenameNode}
              onDeleteNode={this.props.onDeleteNode}
              onItemMove={this.props.onItemMove}
              onItemsMove={this.props.onItemsMove}
              updateDirent={this.props.updateDirent}
              updateTreeNode={this.props.updateTreeNode}
              sortTreeNode={this.props.sortTreeNode}
            />
            <DirViews repoID={repoID} currentPath={currentPath} userPerm={userPerm} currentRepoInfo={currentRepoInfo} />
            <DirTags repoID={repoID} currentPath={currentPath} userPerm={userPerm} currentRepoInfo={currentRepoInfo} />
            <DirOthers repoID={repoID} userPerm={userPerm} currentRepoInfo={currentRepoInfo} updateRepoInfo={this.props.updateRepoInfo} />
          </>
        )}
      </div>
    );
  }
}

DirColumnNav.propTypes = propTypes;

export default DirColumnNav;
