import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import TextTranslation from '../../utils/text-translation';
import RepoInfoBar from '../../components/repo-info-bar';
import ModalPortal from '../modal-portal';
import DirentListView from '../../components/dirent-list-view/dirent-list-view';
import CreateFile from '../../components/dialog/create-file-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';

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
  showShareBtn: PropTypes.bool.isRequired,
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
  updateDirent: PropTypes.func.isRequired,
  isAllItemSelected: PropTypes.bool.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func,
};

class DirListView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      fileType: '',
      isCreateFileDialogShow: false,
      isCreateFolderDialogShow: false,
    }
  }

  onCreateFolderToggle = () => {
    this.setState({isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow});
  }

  onCreateFileToggle = () => {
    this.setState({
      fileType: '',
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
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

  onItemMouseDown = (event) => {
    event.stopPropagation();
    if (event.button ===2) {
      return;
    }
  }

  onItemContextMenu = (event) => {
    this.handleContextClick(event);
  }

  handleContextClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    let x = event.clientX || (event.touches && event.touches[0].pageX);
    let y = event.clientY || (event.touches && event.touches[0].pageY);

    if (this.props.posX) {
        x -= this.props.posX;
    }
    if (this.props.posY) {
        y -= this.props.posY;
    }

    hideMenu();

    let menuList = [TextTranslation.NEW_FOLDER, TextTranslation.NEW_FILE];

    let showMenuConfig = {
      id: 'dirent-container-menu',
      position: { x, y },
      target: event.target,
      currentObject: null,
      menuList: menuList,
    };

    showMenu(showMenuConfig);
  }

  onMenuItemClick = (operation, currentObject, event) => {
    switch (operation) {
      case 'New Folder':
        this.onCreateFolderToggle();
        break;
      case 'New File': 
        this.onCreateFileToggle();
        break;
      default:
        break;
    }
    
    hideMenu();
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
        <div className="table-container" onMouseDown={this.onItemMouseDown} onContextMenu={this.onItemContextMenu}>
          <DirentListView
            path={this.props.path}
            currentRepoInfo={this.props.currentRepoInfo}
            repoID={this.props.repoID}
            isGroupOwnedRepo={this.props.isGroupOwnedRepo}
            enableDirPrivateShare={this.props.enableDirPrivateShare}
            direntList={this.props.direntList}
            showShareBtn={this.props.showShareBtn}
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
            isDirentListLoading={this.props.isDirentListLoading}
            updateDirent={this.props.updateDirent}
            isAllItemSelected={this.props.isAllItemSelected}
            onAllItemSelected={this.props.onAllItemSelected}
            switchAnotherMenuToShow={this.props.switchAnotherMenuToShow}
            appMenuType={this.props.appMenuType}
          />
        </div>
        <Fragment>
          <ContextMenu 
            id={"dirent-container-menu"}
            onMenuItemClick={this.onMenuItemClick}
          />
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
      </Fragment>
    );
  }
}

DirListView.propTypes = propTypes;

export default DirListView;
