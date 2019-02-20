import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext, thumbnailSizeForOriginal } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import DirentListItem from './dirent-list-item';
import ModalPortal from '../modal-portal';
import CreateFile from '../../components/dialog/create-file-dialog';

import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';

import '../../css/tip-for-new-md.css';
import toaster from '../toast';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool,
  currentRepoInfo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
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
  onItemDetails: PropTypes.func.isRequired,
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
      fileType: ''
    };
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

  onItemDetails = (dirent) => {
    this.props.onItemDetails(dirent);
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: ''
    });
  }

  onCreateMarkdownToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.md'
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
  prepareImageItems = () => {
    let items = this.props.direntList.filter((item) => {
      return Utils.imageCheck(item.name);
    });

    const useThumbnail = !this.props.repoEncrypted;
    let prepareItem = (item) => {
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
    };

    return items.map((item) => { return prepareItem(item); });
  }

  showImagePopup = (dirent) => {
    let items = this.props.direntList.filter((item) => {
      return Utils.imageCheck(item.name);
    });
    this.setState({
      isImagePopupOpen: true,
      imageItems: this.prepareImageItems(),
      imageIndex: items.indexOf(dirent)
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

  render() {
    const { direntList, sortBy, sortOrder } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    if (this.props.path == '/' && !direntList.length) {
      return (
        <Fragment>
          <div className="tip-for-new-md d-flex">
            <button className="big-new-md-button" onClick={this.onCreateMarkdownToggle}><span className="sf2-icon-plus add-md-icon"></span><br />{gettext('Markdown Document')}</button>
            <p>{gettext('You can create online document using Markdown format easily. When creating a document, you can mark it as draft. After finishing the draft, you can ask others to review it. They can view the document history in the review page and leave comments on the document.')}</p>
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

    // for image popup
    const imageItems = this.state.imageItems;
    const imageIndex = this.state.imageIndex;
    const imageItemsLength = imageItems.length;
    const imageCaption = imageItemsLength && (
      <Fragment>
        <span>{gettext('%curr% of %total%').replace('%curr%', imageIndex + 1).replace('%total%', imageItemsLength)}</span>
        <br />
        <a href={imageItems[imageIndex].url} target="_blank">{gettext('Open in New Tab')}</a>
      </Fragment>
    );

    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="3%" className="text-center">
                <input type="checkbox" className="vam" onChange={this.props.onAllItemSelected} checked={this.props.isAllItemSelected}/>
              </th>
              <th width="3%">{/*icon */}</th>
              <th width="5%">{/*star */}</th>
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
                    key={index}
                    dirent={dirent}
                    path={this.props.path}
                    repoID={this.props.repoID}
                    currentRepoInfo={this.props.currentRepoInfo}
                    isRepoOwner={this.props.isRepoOwner}
                    direntList={this.props.direntList}
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
                    onItemDetails={this.onItemDetails}
                    showImagePopup={this.showImagePopup}
                    repoEncrypted={this.props.repoEncrypted}
                    enableDirPrivateShare={this.props.enableDirPrivateShare}
                    isAdmin={this.props.isAdmin}
                    isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                  />
                );
              })
            }
          </tbody>
        </table>

        {this.state.isImagePopupOpen && (
          <Lightbox
            mainSrc={imageItems[imageIndex].src}
            imageTitle={imageItems[imageIndex].name}
            imageCaption={imageCaption}
            nextSrc={imageItems[(imageIndex + 1) % imageItemsLength].src}
            prevSrc={imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength].src}
            onCloseRequest={this.closeImagePopup}
            onMovePrevRequest={this.moveToPrevImage}
            onMoveNextRequest={this.moveToNextImage}
            imagePadding={70}
            imageLoadErrorMessage={gettext('The image could not be loaded.')}
            prevLabel={gettext('Previous (Left arrow key)')}
            nextLabel={gettext('Next (Right arrow key)')}
            closeLabel={gettext('Close (Esc)')}
            zoomInLabel={gettext('Zoom in')}
            zoomOutLabel={gettext('Zoom out')}
          />
        )}
      </Fragment>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
