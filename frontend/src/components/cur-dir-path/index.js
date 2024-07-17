import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import SortOptionsDialog from '../../components/dialog/sort-options';
import DirPath from './dir-path';
import DirTool from './dir-tool';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  onTabNavClick: PropTypes.func,
  pathPrefix: PropTypes.array,
  isViewFile: PropTypes.bool,
  updateUsedRepoTags: PropTypes.func.isRequired,
  fileTags: PropTypes.array.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
  toggleTreePanel: PropTypes.func.isRequired,
  direntList: PropTypes.array,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func,
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  isCustomPermission: PropTypes.bool,
  repoEncrypted: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  fullDirentList: PropTypes.array.isRequired,
  filePermission: PropTypes.string,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
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
    const isDesktop = Utils.isDesktop();
    return (
      <div className="cur-dir-path d-flex justify-content-between align-items-center">
        <DirPath
          repoID={this.props.repoID}
          repoName={this.props.repoName}
          repoEncrypted={this.props.repoEncrypted}
          isGroupOwnedRepo={this.props.isGroupOwnedRepo}
          pathPrefix={this.props.pathPrefix}
          currentPath={this.props.currentPath}
          userPerm={this.props.userPerm}
          onPathClick={this.props.onPathClick}
          onTabNavClick={this.props.onTabNavClick}
          isViewFile={this.props.isViewFile}
          fileTags={this.props.fileTags}
          toggleTreePanel={this.props.toggleTreePanel}
          enableDirPrivateShare={this.props.enableDirPrivateShare}
          showShareBtn={this.props.showShareBtn}
          onAddFolder={this.props.onAddFolder}
          onAddFile={this.props.onAddFile}
          onUploadFile={this.props.onUploadFile}
          onUploadFolder={this.props.onUploadFolder}
          direntList={this.props.fullDirentList}
          filePermission={this.props.filePermission}
          onFileTagChanged={this.props.onFileTagChanged}
          repoTags={this.props.repoTags}
        />
        {isDesktop &&
        <DirTool
          repoID={this.props.repoID}
          repoName={this.props.repoName}
          userPerm={this.props.userPerm}
          currentPath={this.props.currentPath}
          updateUsedRepoTags={this.props.updateUsedRepoTags}
          onDeleteRepoTag={this.props.onDeleteRepoTag}
          currentMode={this.props.currentMode}
          switchViewMode={this.props.switchViewMode}
          isCustomPermission={this.props.isCustomPermission}
          sortBy={this.props.sortBy}
          sortOrder={this.props.sortOrder}
          sortItems={this.props.sortItems}
        />}
        {!isDesktop && this.props.direntList.length > 0 &&
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
