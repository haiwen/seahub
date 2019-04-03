import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import RepoInfoBar from '../../components/repo-info-bar';
import ModalPortal from '../modal-portal';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import CreateFile from '../../components/dialog/create-file-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import DirentListMenu from '../dirent-list-view/dirent-right-menu';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isRepoInfoBarShow: PropTypes.bool.isRequired,
  usedRepoTags: PropTypes.array.isRequired,
  readmeMarkdown: PropTypes.object,
  draftCounts: PropTypes.number,
  updateUsedRepoTags: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  showDifferentContextmenu: PropTypes.func,
  isContainerTreeItemType: PropTypes.oneOf(['container_contextmenu', 'item_contextmenu', 'tree_contextmenu']),
};

class DirListView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      isCreateFileDialogShow: false,
      fileType: '',
      isContainerContextmenuShow: false,
      isCreateFolderDialogShow: false,
      itemMousePosition: {clientX: '', clientY: ''},
      isContainerTreeItemType: false,
    }
  }

  componentDidUpdate() {
    this.registerTableContainerContextmenuHandler();
  }

  componentWillUnmount() {
    this.unregisterTableContainerContextmenuHandler();
  }

  registerTableContainerContextmenuHandler = (e) => {
    let tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.addEventListener('contextmenu', this.tableContainerContextmenuHandler);
    }
  }

  unregisterTableContainerContextmenuHandler = (e) => {
    let tableContainer = document.querySelector('.table-container');
    tableContainer.removeEventListener('contextmenu', this.tableContainerContextmenuHandler);
  }

  tableContainerContextmenuHandler = (e) => {
    e.preventDefault();
    
    this.props.showDifferentContextmenu('container_contextmenu');

    this.setState({isContainerContextmenuShow: false});
    setTimeout(() => {
      this.setState({
        isContainerContextmenuShow: true,
        itemMousePosition: {clientX: e.clientX, clientY: e.clientY}
      })
    },40)
  }

  closeTableContainerRightMenu = () => {
    this.setState({
      isContainerContextmenuShow: false,
    });
  }

  onCreateFolderToggle = () => {
    this.setState({
      isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow,
    });
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: ''
    });
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  onAddFolder = (dirPath) => {
    this.setState({isCreateFolderDialogShow: false});
    this.props.onAddFolder(dirPath);
  }

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  render() {
    return (
      <Fragment>
        {this.props.isRepoInfoBarShow && (
          <RepoInfoBar 
            repoID={this.props.repoID}
            currentPath={this.props.path}
            readmeMarkdown={this.props.readmeMarkdown}
            draftCounts={this.props.draftCounts}
            usedRepoTags={this.props.usedRepoTags}
            updateUsedRepoTags={this.props.updateUsedRepoTags}
          />
        )}
        <div className="table-container">
          <DirentListView
            path={this.props.path}
            currentRepoInfo={this.props.currentRepoInfo}
            repoID={this.props.repoID}
            isGroupOwnedRepo={this.props.isGroupOwnedRepo}
            enableDirPrivateShare={this.props.enableDirPrivateShare}
            direntList={this.props.direntList}
            sortBy={this.props.sortBy}
            sortOrder={this.props.sortOrder}
            sortItems={this.props.sortItems}
            onAddFile={this.props.onAddFile}
            onItemClick={this.props.onItemClick}
            onItemSelected={this.props.onItemSelected}
            onItemDelete={this.props.onItemDelete}
            onItemRename={this.props.onItemRename}
            onItemMove={this.props.onItemMove}
            onItemCopy={this.props.onItemCopy}
            onDirentClick={this.props.onDirentClick}
            onItemDetails={this.props.onItemDetails}
            isDirentListLoading={this.props.isDirentListLoading}
            updateDirent={this.props.updateDirent}
            isAllItemSelected={this.props.isAllItemSelected}
            onAllItemSelected={this.props.onAllItemSelected}
            showDifferentContextmenu={this.props.showDifferentContextmenu}
            isContainerTreeItemType={this.props.isContainerTreeItemType}
          />
        </div>
        {this.state.isContainerContextmenuShow && this.props.isContainerTreeItemType === 'container_contextmenu' && (
          <DirentListMenu 
            mousePosition={this.state.itemMousePosition}
            itemUnregisterHandlers={this.unregisterTableContainerContextmenuHandler}
            itemRegisterHandlers={this.registerTableContainerContextmenuHandler}
            closeRightMenu={this.closeTableContainerRightMenu}
            onCreateFolderToggle={this.onCreateFolderToggle}
            onCreateFileToggle={this.onCreateFileToggle}
          />
        )}
        {this.state.isCreateFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.props.path}
              onAddFolder={this.onAddFolder}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onCreateFolderToggle}
            />
          </ModalPortal>
        )} 
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.onAddFile}
              checkDuplicatedName={this.checkDuplicatedName}
              addFileCancel={this.onCreateFileToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

DirListView.propTypes = propTypes;

export default DirListView;
