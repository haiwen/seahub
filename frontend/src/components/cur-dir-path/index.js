import React from 'react';
import PropTypes from 'prop-types';
import SortOptionsDialog from '../../components/dialog/sort-options';
import DirPath from './dir-path';

const propTypes = {
  currentRepoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  fileTags: PropTypes.array.isRequired,
  toggleTreePanel: PropTypes.func.isRequired,
  isTreePanelShown: PropTypes.bool.isRequired,
  direntList: PropTypes.array,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func,
  repoEncrypted: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  fullDirentList: PropTypes.array.isRequired,
  filePermission: PropTypes.string,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  loadDirentList: PropTypes.func.isRequired,
};

class CurDirPath extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isSortOptionsDialogOpen: false
    };
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  render() {
    return (
      <div className="cur-dir-path d-flex justify-content-between align-items-center">
        <DirPath
          currentRepoInfo={this.props.currentRepoInfo}
          repoID={this.props.repoID}
          repoName={this.props.repoName}
          repoEncrypted={this.props.repoEncrypted}
          isGroupOwnedRepo={this.props.isGroupOwnedRepo}
          pathPrefix={this.props.pathPrefix}
          currentPath={this.props.currentPath}
          userPerm={this.props.userPerm}
          onPathClick={this.props.onPathClick}
          onTabNavClick={this.props.onTabNavClick}
          fileTags={this.props.fileTags}
          toggleTreePanel={this.props.toggleTreePanel}
          isTreePanelShown={this.props.isTreePanelShown}
          enableDirPrivateShare={this.props.enableDirPrivateShare}
          showShareBtn={this.props.showShareBtn}
          onUploadFile={this.props.onUploadFile}
          onUploadFolder={this.props.onUploadFolder}
          direntList={this.props.fullDirentList}
          filePermission={this.props.filePermission}
          onFileTagChanged={this.props.onFileTagChanged}
          repoTags={this.props.repoTags}
          eventBus={this.props.eventBus}
          onItemMove={this.props.onItemMove}
          loadDirentList={this.props.loadDirentList}
        />
        {!this.props.isDesktop && this.props.direntList.length > 0 &&
        <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
        {this.state.isSortOptionsDialogOpen &&
        <SortOptionsDialog
          toggleDialog={this.toggleSortOptionsDialog}
          sortBy={this.props.sortBy}
          sortOrder={this.props.sortOrder}
          sortItems={this.props.sortItems}
        />
        }
      </div>
    );
  }
}

CurDirPath.propTypes = propTypes;

export default CurDirPath;
