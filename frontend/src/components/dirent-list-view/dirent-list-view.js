import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext, thumbnailSizeForOriginal, username } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import toaster from '../toast';
import ModalPortal from '../modal-portal';
import CreateFile from '../../components/dialog/create-file-dialog';
import ImageDialog from '../../components/dialog/image-dialog';
import DirentListItem from './dirent-list-item';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu } from '../context-menu/actions';
import ContextMenu from '../context-menu/context-menu';
import DirentListItem from './dirent-list-item';

import '../../css/tip-for-new-md.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,

      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0,

      isCreateFileDialogShow: false,
      fileType: '',
    };

    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
    this.isAdmin = props.currentRepoInfo.is_admin;
    this.repoEncrypted = props.currentRepoInfo.encrypted;

    this.direntItems = [];
    this.currentItemRef = null;
  }

  onThreadMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  }

  onThreadContextMenu = (event) => {
    event.stopPropagation();
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  onItemRename = (dirent, newName) => {
    let isDuplicated = this.props.direntList.some(item => {
      return item.name === newName;
    });
    if (isDuplicated) {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      toaster.danger(errMessage);
      return false;
    }
    this.props.onItemRename(dirent, newName);
  }

  onItemRenameToggle = () => {
    this.onFreezedItem();
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: ''
    });
  }

  onCreateNewFile = (suffix) => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: suffix
    });
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  // for image popup
  prepareImageItem = (item) => {
    const useThumbnail = !this.repoEncrypted;
    const name = item.name;

    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
    const isGIF = fileExt == 'gif';

    const path = Utils.encodePath(Utils.joinPath(this.props.path, name));
    const repoID = this.props.repoID;
    let src;
    if (useThumbnail && !isGIF) {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
    } else {
      src = `${siteRoot}repo/${repoID}/raw${path}`;
    }

    return {
      'name': name,
      'url': `${siteRoot}lib/${repoID}/file${path}`,
      'src': src
    };
  }

  showImagePopup = (curItem) => {
    let items = this.props.direntList.filter((item) => {
      return Utils.imageCheck(item.name);
    });

    const imageItems = items.map((item) => {
      return this.prepareImageItem(item);
    });

    this.setState({
      isImagePopupOpen: true,
      imageItems: imageItems,
      imageIndex: items.indexOf(curItem)
    });
  }

  moveToPrevImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + imageItemsLength - 1) % imageItemsLength
    }));
  }

  moveToNextImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + 1) % imageItemsLength
    }));
  }

  closeImagePopup = () => {
    this.setState({
      isImagePopupOpen: false
    });
  }

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  setDirentItemRef = (index) => item => {
    this.direntItems[index] = item;
  }

  onMenuItemClick = (operation, currentObject, event) => {
    let index = this.getDirentIndex(currentObject);
    this.direntItems[index].onMenuItemClick(operation, event);
    hideMenu();
  }

  getDirentIndex = (dirent) => {
    let direntList = this.props.direntList;
    let index = 0;
    for (let i = 0; i < direntList.length; i++) {
      if (direntList[i].name === dirent.name) {
        index = i;
        break;
      }
    } 
    return index;
  }

  onShowMenu = (e) => {
    this.onFreezedItem();
  }

  onHideMenu = (e) => {
    this.onUnfreezedItem();
  }

  render() {
    const { direntList, sortBy, sortOrder } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    if (this.props.path == '/' && !direntList.length) {
      return (
        <Fragment>
          <div className="tip-for-new-file">
            <p className="text-center">{gettext('This folder has no content at this time.')}</p>
            <p className="text-center">{gettext('You can create files quickly')}{' +'}</p>
            <div className="big-new-file-button-group">
              <div className="d-flex justify-content-center">
                <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.md')}>
                  {'+ Markdown'}</button>
                <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.ppt')}>
                  {'+ PPT'}</button>
              </div>
              <div className="d-flex justify-content-center">
                <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.doc')}>
                  {'+ Word'}</button>
                <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.xls')}>
                  {'+ Excel'}</button>
              </div>
            </div>
          </div>
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

    // sort
    const sortByName = sortBy == 'name';
    const sortByTime = sortBy == 'time';
    const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

    return (
      <Fragment>
        <table>
          <thead onMouseDown={this.onThreadMouseDown} onContextMenu={this.onThreadContextMenu}>
            <tr>
              <th width="3%" className="pl10">
                <input type="checkbox" className="vam" onChange={this.props.onAllItemSelected} checked={this.props.isAllItemSelected}/>
              </th>
              <th width="3%" className="pl10">{/*icon */}</th>
              <th width="5%" className="pl10">{/*star */}</th>
              <th width="39%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
              <th width="6%">{/*tag */}</th>
              <th width="18%">{/*operation */}</th>
              <th width="11%">{gettext('Size')}</th>
              <th width="15%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            </tr>
          </thead>
          <tbody>
            {
              direntList.length !== 0 && direntList.map((dirent, index) => {
                return (
                  <DirentListItem
                    ref={this.setDirentItemRef(index)}
                    key={index}
                    dirent={dirent}
                    path={this.props.path}
                    repoID={this.props.repoID}
                    currentRepoInfo={this.props.currentRepoInfo}
                    isAdmin={this.isAdmin}
                    isRepoOwner={this.isRepoOwner}
                    repoEncrypted={this.repoEncrypted}
                    enableDirPrivateShare={this.props.enableDirPrivateShare}
                    isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                    showShareBtn={this.props.showShareBtn}
                    onItemClick={this.props.onItemClick}
                    onItemRenameToggle={this.onItemRenameToggle}
                    onItemSelected={this.props.onItemSelected}
                    onItemDelete={this.props.onItemDelete}
                    onItemRename={this.onItemRename}
                    onItemMove={this.props.onItemMove}
                    onItemCopy={this.props.onItemCopy}
                    updateDirent={this.props.updateDirent}
                    isItemFreezed={this.state.isItemFreezed}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    onDirentClick={this.props.onDirentClick}
                    showImagePopup={this.showImagePopup}
                  />
                );
              })
            }
          </tbody>
        </table>

        {this.state.isImagePopupOpen && (
          <ModalPortal>
            <ImageDialog
              imageItems={this.state.imageItems}
              imageIndex={this.state.imageIndex}
              closeImagePopup={this.closeImagePopup}
              moveToPrevImage={this.moveToPrevImage}
              moveToNextImage={this.moveToNextImage}
            />
          </ModalPortal>
        )}
        <ContextMenu 
          id={'dirent-item-menu'}
          onMenuItemClick={this.onMenuItemClick}
          onShowMenu={this.onShowMenu}
          onHideMenu={this.onHideMenu}
        />
      </Fragment>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
