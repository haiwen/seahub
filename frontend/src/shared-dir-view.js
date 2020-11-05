import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Button, Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import moment from 'moment';
import Account from './components/common/account';
import { isPro, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, thumbnailSizeForOriginal } from './utils/constants';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import toaster from './components/toast';
import ModalPortal from './components/modal-portal';
import ZipDownloadDialog from './components/dialog/zip-download-dialog';
import ImageDialog from './components/dialog/image-dialog';
import FileUploader from './components/shared-link-file-uploader/file-uploader';

import './css/shared-dir-view.css';
import './css/grid-view.css';

moment.locale(window.app.config.lang);

let loginUser = window.app.pageOptions.name;
const {
  token, dirName, sharedBy,
  repoID, path,
  mode, thumbnailSize, zipped,
  trafficOverLimit, canDownload,
  noQuota, canUpload
} = window.shared.pageOptions;

const showDownloadIcon = !trafficOverLimit && canDownload;

class SharedDirView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      items: [],

      isAllItemsSelected: false,
      selectedItems: [],

      sortBy: 'name', // 'name' or 'time' or 'size'
      sortOrder: 'asc', // 'asc' or 'desc'

      isZipDialogOpen: false,
      zipFolderPath: '',

      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0
    };
  }

  componentDidMount() {
    if (trafficOverLimit) {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }

    seafileAPI.listSharedDir(token, path, thumbnailSize).then((res) => {
      const items = res.data['dirent_list'].map(item => {
        item.isSelected = false;
        return item;
      });
      this.setState({
        isLoading: false,
        errorMsg: '',
        items: Utils.sortDirentsInSharedDir(items, this.state.sortBy, this.state.sortOrder)
      });
      this.getThumbnails();
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortDirentsInSharedDir(this.state.items, sortBy, sortOrder)
    });
  }

  getThumbnails = () => {
    let items = this.state.items.filter((item) => {
      return !item.is_dir && Utils.imageCheck(item.file_name) && !item.encoded_thumbnail_src;
    });
    if (items.length == 0) {
      return ;
    }

    const len = items.length;
    const _this = this;
    let getThumbnail = function(i) {
      const curItem = items[i];
      seafileAPI.getShareLinkThumbnail(token, curItem.file_path, thumbnailSize).then((res) => {
        curItem.encoded_thumbnail_src = res.data.encoded_thumbnail_src;
      }).catch((error) => {
        // do nothing
      }).then(() => {
        if (i < len - 1) {
          getThumbnail(++i);
        } else {
          // when done, `setState()`
          _this.setState({
            items: _this.state.items
          });
        }
      });
    };
    getThumbnail(0);
  }

  renderPath = () => {
    return (
      <React.Fragment>
        {zipped.map((item, index) => {
          if (index != zipped.length - 1) {
            return (
              <React.Fragment key={index}>
                <a href={`?p=${encodeURIComponent(item.path)}&mode=${mode}`}>{item.name}</a>
                <span> / </span>
              </React.Fragment>
            );
          }
        })
        }
        {zipped[zipped.length - 1].name}
      </React.Fragment>
    );
  }

  zipDownloadFolder = (folderPath) => {
    this.setState({
      isZipDialogOpen: true,
      zipFolderPath: folderPath
    });
  }

  zipDownloadSelectedItems = () => {
    this.setState({
      isZipDialogOpen: true,
      zipFolderPath: path,
      selectedItems: this.state.items.filter(item => item.isSelected)
        .map(item => item.file_name || item.folder_name)
    });
  }

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false,
      zipFolderPath: '',
      selectedItems: []
    });
  }

  // for image popup
  prepareImageItem = (item) => {
    const name = item.file_name;
    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
    const isGIF = fileExt == 'gif';

    let src;
    const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
    if (!isGIF) {
      src = `${siteRoot}thumbnail/${token}/${thumbnailSizeForOriginal}${Utils.encodePath(item.file_path)}`;
    } else {
      src = `${fileURL}&raw=1`;
    }

    return {
      'name': name,
      'url': fileURL,
      'src': src
    };
  }

  showImagePopup = (curItem) => {
    const items = this.state.items.filter((item) => {
      return !item.is_dir && Utils.imageCheck(item.file_name);
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

  closeImagePopup = () => {
    this.setState({
      isImagePopupOpen: false
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

  toggleAllSelected = () => {
    this.setState((prevState) => ({
      isAllItemsSelected: !prevState.isAllItemsSelected,
      items: this.state.items.map((item) => {
        item.isSelected = !prevState.isAllItemsSelected;
        return item;
      })
    }));
  }

  toggleItemSelected = (targetItem, isSelected) => {
    this.setState({
      items: this.state.items.map((item) => {
        if (item === targetItem) {
          item.isSelected = isSelected;
        }
        return item;
      })
    }, () => {
      this.setState({
        isAllItemsSelected: !this.state.items.some(item => !item.isSelected)
      });
    });
  }

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  onFileUploadSuccess = (direntObject) => {
    const { name, size } = direntObject;
    const newItem = {
      isSelected: false,
      file_name: name,
      file_path: Utils.joinPath(path, name),
      is_dir: false,
      last_modified: moment().format(),
      size: size
    };
    const folderItems = this.state.items.filter(item => { return item.is_dir; });
    // put the new file as the first file
    let items = Array.from(this.state.items);
    items.splice(folderItems.length, 0, newItem);
    this.setState({items: items});
  }

  render() {
    const isDesktop = Utils.isDesktop();
    const modeBaseClass = 'btn btn-secondary btn-icon sf-view-mode-btn';
    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            {loginUser && <Account />}
          </div>
          <div className="o-auto">
            <div className="shared-dir-view-main">
              <h2 className="h3">{dirName}</h2>
              <p>{gettext('Shared by: ')}{sharedBy}</p>
              <div className="d-flex justify-content-between align-items-center op-bar">
                <p className="m-0">{gettext('Current path: ')}{this.renderPath()}</p>
                <div>
                  {isDesktop &&
                  <div className="view-mode btn-group">
                    <a href={`?p=${encodeURIComponent(path)}&mode=list`} className={`${modeBaseClass} sf2-icon-list-view ${mode == 'list' ? 'current-mode' : ''}`} title={gettext('List')}></a>
                    <a href={`?p=${encodeURIComponent(path)}&mode=grid`} className={`${modeBaseClass} sf2-icon-grid-view ${mode == 'grid' ? 'current-mode' : ''}`} title={gettext('Grid')}></a>
                  </div>
                  }
                  {canUpload && (
                    <Button disabled={noQuota}
                      title={noQuota ? gettext('The owner of this library has run out of space.') : ''}
                      onClick={this.onUploadFile} className="ml-2 shared-dir-op-btn shared-dir-upload-btn">{gettext('Upload')}</Button>
                  )}
                  {showDownloadIcon &&
                  <Fragment>
                    {this.state.items.some(item => item.isSelected) ?
                      <Button color="success" onClick={this.zipDownloadSelectedItems} className="ml-2 shared-dir-op-btn">{gettext('ZIP Selected Items')}</Button> :
                      <Button color="success" onClick={this.zipDownloadFolder.bind(this, path)} className="ml-2 shared-dir-op-btn">{gettext('ZIP')}</Button>
                    }
                  </Fragment>
                  }
                </div>
              </div>
              {!noQuota && canUpload && (
                <FileUploader
                  ref={uploader => this.uploader = uploader}
                  dragAndDrop={false}
                  token={token}
                  path={path}
                  repoID={repoID}
                  onFileUploadSuccess={this.onFileUploadSuccess}
                />
              )}
              <Content
                isDesktop={isDesktop}
                isLoading={this.state.isLoading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                sortBy={this.state.sortBy}
                sortOrder={this.state.sortOrder}
                sortItems={this.sortItems}
                isAllItemsSelected={this.state.isAllItemsSelected}
                toggleAllSelected={this.toggleAllSelected}
                toggleItemSelected={this.toggleItemSelected}
                zipDownloadFolder={this.zipDownloadFolder}
                showImagePopup={this.showImagePopup}
              />
            </div>
          </div>
        </div>
        {this.state.isZipDialogOpen &&
        <ModalPortal>
          <ZipDownloadDialog
            token={token}
            path={this.state.zipFolderPath}
            target={this.state.selectedItems}
            toggleDialog={this.closeZipDialog}
          />
        </ModalPortal>
        }
        {this.state.isImagePopupOpen &&
        <ModalPortal>
          <ImageDialog
            imageItems={this.state.imageItems}
            imageIndex={this.state.imageIndex}
            closeImagePopup={this.closeImagePopup}
            moveToPrevImage={this.moveToPrevImage}
            moveToNextImage={this.moveToNextImage}
          />
        </ModalPortal>
        }
      </React.Fragment>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
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

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  render() {
    const {
      isDesktop,
      isLoading, errorMsg, items,
      sortBy, sortOrder,
      isAllItemsSelected
    } = this.props;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    const tbody = (
      <tbody>
        {items.map((item, index) => {
          return <Item
            key={index}
            isDesktop={isDesktop}
            item={item}
            zipDownloadFolder={this.props.zipDownloadFolder}
            showImagePopup={this.props.showImagePopup}
            toggleItemSelected={this.props.toggleItemSelected}
          />;
        })}
      </tbody>
    );

    if (!isDesktop) {
      return (
        <table className="table-hover table-thead-hidden">
          <thead>
            <tr>
              <th width="12%"></th>
              <th width="80%"></th>
              <th width="8%"></th>
            </tr>
          </thead>
          {tbody}
        </table>
      );
    }

    const sortIcon = <span className={`fas ${sortOrder == 'asc' ? 'fa-caret-up' : 'fa-caret-down'}`}></span>;
    return mode == 'list' ? (
      <table className="table-hover">
        <thead>
          <tr>
            {showDownloadIcon &&
            <th width="3%" className="text-center">
              <input type="checkbox" checked={isAllItemsSelected} onChange={this.props.toggleAllSelected} />
            </th>
            }
            <th width="5%"></th>
            <th width={showDownloadIcon ? '52%' : '55%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortBy == 'name' && sortIcon}</a></th>
            <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBy == 'size' && sortIcon}</a></th>
            <th width="16%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortBy == 'time' && sortIcon}</a></th>
            <th width="10%"></th>
          </tr>
        </thead>
        {tbody}
      </table>
    ) : (
      <ul className="grid-view">
        {items.map((item, index) => {
          return <GridItem
            key={index}
            item={item}
            zipDownloadFolder={this.props.zipDownloadFolder}
            showImagePopup={this.props.showImagePopup}
          />;
        })}
      </ul>
    );
  }
}

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false,
      isOpMenuOpen: false
    };
  }

  toggleOpMenu = () => {
    this.setState({isOpMenuOpen: !this.state.isOpMenuOpen});
  }

  handleMouseOver = () => {
    this.setState({isIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isIconShown: false});
  }

  zipDownloadFolder = (e) => {
    e.preventDefault();
    this.props.zipDownloadFolder.bind(this, this.props.item.folder_path)();
  }

  handleFileClick = (e) => {
    const item = this.props.item;
    if (!Utils.imageCheck(item.file_name)) {
      return;
    }

    e.preventDefault();
    this.props.showImagePopup(item);
  }

  toggleItemSelected = (e) => {
    this.props.toggleItemSelected(this.props.item, e.target.checked);
  }

  render() {
    const { item, isDesktop } = this.props;
    const { isIconShown } = this.state;

    if (item.is_dir) {
      return isDesktop ? (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          {showDownloadIcon &&
            <td className="text-center">
              <input type="checkbox" checked={item.isSelected} onChange={this.toggleItemSelected} />
            </td>
          }
          <td className="text-center"><img src={Utils.getFolderIconUrl()} alt="" width="24" /></td>
          <td>
            <a href={`?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}&mode=${mode}`}>{item.folder_name}</a>
          </td>
          <td></td>
          <td title={moment(item.last_modified).format('llll')}>{moment(item.last_modified).fromNow()}</td>
          <td>
            {showDownloadIcon &&
            <a className={`action-icon sf2-icon-download${isIconShown ? '' : ' invisible'}`} href="#" onClick={this.zipDownloadFolder} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
            }
          </td>
        </tr>
      ) : (
        <tr>
          <td className="text-center"><img src={Utils.getFolderIconUrl()} alt="" width="24" /></td>
          <td>
            <a href={`?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}&mode=${mode}`}>{item.folder_name}</a>
            <br />
            <span className="item-meta-info">{moment(item.last_modified).fromNow()}</span>
          </td>
          <td>
            {showDownloadIcon &&
            <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
              <DropdownToggle
                tag="i"
                className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isOpMenuOpen}
              />
              <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
                <div className="mobile-operation-menu-bg-layer"></div>
                <div className="mobile-operation-menu">
                  <DropdownItem className="mobile-menu-item" onClick={this.zipDownloadFolder}>{gettext('Download')}</DropdownItem>
                </div>
              </div>
            </Dropdown>
            }
          </td>
        </tr>
      );
    } else {
      const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
      const thumbnailURL = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}` : '';
      return isDesktop ? (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          {showDownloadIcon &&
            <td className="text-center">
              <input type="checkbox" checked={item.isSelected} onChange={this.toggleItemSelected} />
            </td>
          }
          <td className="text-center">
            {thumbnailURL ?
              <img className="thumbnail" src={thumbnailURL} alt="" /> :
              <img src={Utils.getFileIconUrl(item.file_name)} alt="" width="24" />
            }
          </td>
          <td>
            <a href={fileURL} onClick={this.handleFileClick}>{item.file_name}</a>
          </td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td title={moment(item.last_modified).format('llll')}>{moment(item.last_modified).fromNow()}</td>
          <td>
            {showDownloadIcon &&
            <a className={`action-icon sf2-icon-download${isIconShown ? '' : ' invisible'}`} href={`${fileURL}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}></a>
            }
          </td>
        </tr>
      ) : (
        <tr>
          <td className="text-center">
            {thumbnailURL ?
              <img className="thumbnail" src={thumbnailURL} alt="" /> :
              <img src={Utils.getFileIconUrl(item.file_name)} alt="" width="24" />
            }
          </td>
          <td>
            <a href={fileURL} onClick={this.handleFileClick}>{item.file_name}</a>
            <br />
            <span className="item-meta-info">{Utils.bytesToSize(item.size)}</span>
            <span className="item-meta-info">{moment(item.last_modified).fromNow()}</span>
          </td>
          <td>
            {showDownloadIcon &&
            <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
              <DropdownToggle
                tag="i"
                className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isOpMenuOpen}
              />
              <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
                <div className="mobile-operation-menu-bg-layer"></div>
                <div className="mobile-operation-menu">
                  <DropdownItem className="mobile-menu-item" tag="a" href={`${fileURL}&dl=1`}>{gettext('Download')}</DropdownItem>
                </div>
              </div>
            </Dropdown>
            }
          </td>
        </tr>
      );
    }
  }
}

class GridItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({isIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isIconShown: false});
  }

  zipDownloadFolder = (e) => {
    e.preventDefault();
    this.props.zipDownloadFolder.bind(this, this.props.item.folder_path)();
  }

  handleFileClick = (e) => {
    const item = this.props.item;
    if (!Utils.imageCheck(item.file_name)) {
      return;
    }

    e.preventDefault();
    this.props.showImagePopup(item);
  }

  render() {
    const item = this.props.item;
    const { isIconShown } = this.state;

    if (item.is_dir) {
      const folderURL = `?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}&mode=${mode}`;
      return (
        <li className="grid-item" onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <a href={folderURL} className="grid-file-img-link d-block">
            <img src={Utils.getFolderIconUrl(false, 192)} alt="" width="96" height="96" />
          </a>
          <a href={folderURL} className="grid-file-name grid-file-name-link">{item.folder_name}</a>
          {showDownloadIcon &&
            <a className={`action-icon sf2-icon-download${isIconShown ? '' : ' invisible'}`} href="#" onClick={this.zipDownloadFolder} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
          }
        </li>
      );
    } else {
      const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
      const thumbnailURL = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}` : '';
      return (
        <li className="grid-item" onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <a href={fileURL} className="grid-file-img-link d-block" onClick={this.handleFileClick}>
            {thumbnailURL ?
              <img className="thumbnail" src={thumbnailURL} alt="" /> :
              <img src={Utils.getFileIconUrl(item.file_name, 192)} alt="" width="96" height="96" />
            }
          </a>
          <a href={fileURL} className="grid-file-name grid-file-name-link" onClick={this.handleFileClick}>{item.file_name}</a>
          {showDownloadIcon &&
            <a className={`action-icon sf2-icon-download${isIconShown ? '' : ' invisible'}`} href={`${fileURL}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
          }
        </li>
      );
    }
  }
}

ReactDOM.render(
  <SharedDirView />,
  document.getElementById('wrapper')
);
