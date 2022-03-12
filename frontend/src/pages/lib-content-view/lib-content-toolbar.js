import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import ViewModeToolbar from '../../components/toolbar/view-mode-toolbar';
import DirOperationToolBar from '../../components/toolbar/dir-operation-toolbar';
import MultipleDirOperationToolbar from '../../components/toolbar/multiple-dir-operation-toolbar';
import ViewFileToolbar from '../../components/toolbar/view-file-toolbar';
import { Utils } from '../../utils/utils';

const propTypes = {
  isViewFile: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
  isDraft: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  fileTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,  // for file-view-toolbar
  // side-panel
  onSideNavMenuClick: PropTypes.func.isRequired,
  // mutiple-dir
  isDirentSelected: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  // dir
  direntList: PropTypes.array.isRequired,
  repoName: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUploadFile: PropTypes.func.isRequired,
  onUploadFolder: PropTypes.func.isRequired,
  // view-mode
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  // search
  onSearchedClick: PropTypes.func.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  // selected menu
  onFilesTagChanged: PropTypes.func.isRequired, // for mutiple select toolbar
  updateDirent: PropTypes.func.isRequired,
  unSelectDirent: PropTypes.func,
  currentRepoInfo: PropTypes.object,
};

class LibContentToolbar extends React.Component {

  render() {

    const { userPerm } = this.props;
    const { isCustomPermission } = Utils.getUserPermission(userPerm);

    if (this.props.isViewFile) {
      return (
        <Fragment>
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
            <ViewFileToolbar
              path={this.props.path}
              repoID={this.props.repoID}
              userPerm={this.props.userPerm}
              repoEncrypted={this.props.repoEncrypted}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              filePermission={this.props.filePermission}
              isDraft={this.props.isDraft}
              hasDraft={this.props.hasDraft}
              fileTags={this.props.fileTags}
              onFileTagChanged={this.props.onFileTagChanged}
              showShareBtn={this.props.showShareBtn}
            />
            <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode} isCustomPermission={isCustomPermission} />
          </div>
          <CommonToolbar isLibView={true} repoID={this.props.repoID} repoName={this.props.repoName} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
        </Fragment>
      );
    }

    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu hidden-md-up d-md-none side-nav-toggle" title={gettext('Side Nav Menu')} onClick={this.props.onSideNavMenuClick}></span>
          {this.props.isDirentSelected ?
            <MultipleDirOperationToolbar
              repoID={this.props.repoID}
              path={this.props.path}
              userPerm={this.props.userPerm}
              repoEncrypted={this.props.repoEncrypted}
              selectedDirentList={this.props.selectedDirentList}
              direntList={this.props.direntList}
              onItemsMove={this.props.onItemsMove}
              onItemsCopy={this.props.onItemsCopy}
              onItemsDelete={this.props.onItemsDelete}
              onItemRename={this.props.onItemRename}
              isRepoOwner={this.props.isRepoOwner}
              currentRepoInfo={this.props.currentRepoInfo}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              updateDirent={this.props.updateDirent}
              unSelectDirent={this.props.unSelectDirent}
              onFilesTagChanged={this.props.onFilesTagChanged}
              showShareBtn={this.props.showShareBtn}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              showDirentDetail={this.props.showDirentDetail}
              currentMode={this.props.currentMode}
              switchViewMode={this.props.switchViewMode}
            /> :
            <DirOperationToolBar
              path={this.props.path}
              repoID={this.props.repoID}
              repoName={this.props.repoName}
              repoEncrypted={this.props.repoEncrypted}
              direntList={this.props.direntList}
              showShareBtn={this.props.showShareBtn}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              onAddFile={this.props.onAddFile}
              onAddFolder={this.props.onAddFolder}
              onUploadFile={this.props.onUploadFile}
              onUploadFolder={this.props.onUploadFolder}
              currentMode={this.props.currentMode}
              switchViewMode={this.props.switchViewMode}
            />
          }
        </div>
        <CommonToolbar isLibView={true} repoID={this.props.repoID} repoName={this.props.repoName} onSearchedClick={this.props.onSearchedClick} searchPlaceholder={gettext('Search files in this library')}/>
      </Fragment>
    );
  }
}

LibContentToolbar.propTypes = propTypes;

export default LibContentToolbar;
