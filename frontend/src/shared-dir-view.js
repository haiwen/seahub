import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'reactstrap';
import moment from 'moment';
import Account from './components/common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, thumbnailSizeForOriginal } from './utils/constants';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import toaster from './components/toast';
import ModalPortal from './components/modal-portal';
import ZipDownloadDialog from './components/dialog/zip-download-dialog';
import ImageDialog from './components/dialog/image-dialog';

import './css/shared-dir-view.css';
import './css/grid-view.css';

let loginUser = window.app.pageOptions.name;
const { token, trafficOverLimit, dirName, sharedBy, path, canDownload, mode, thumbnailSize, zipped } = window.shared.pageOptions;

const showDownloadIcon = !trafficOverLimit && canDownload;

class SharedDirView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      items: [],

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
      const items = res.data['dirent_list'];
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

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false,
      zipFolderPath: ''
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

  render() {
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
              <h2 className="title">{dirName}</h2>
              <p>{gettext('Shared by: ')}{sharedBy}</p>
              <div className="d-flex justify-content-between align-items-center op-bar">
                <p className="m-0">{gettext('Current path: ')}{this.renderPath()}</p>
                <div>
                  <div className="view-mode btn-group">
                    <a href={`?p=${encodeURIComponent(path)}&mode=list`} className={`${modeBaseClass} sf2-icon-list-view ${mode == 'list' ? 'current-mode' : ''}`} title={gettext('List')}></a>
                    <a href={`?p=${encodeURIComponent(path)}&mode=grid`} className={`${modeBaseClass} sf2-icon-grid-view ${mode == 'grid' ? 'current-mode' : ''}`} title={gettext('Grid')}></a>
                  </div>
                  {showDownloadIcon &&
                  <Button color="success" onClick={this.zipDownloadFolder.bind(this, path)} className="ml-2 zip-btn">{gettext('ZIP')}</Button>
                  }
                </div>
              </div>
              <Content
                isLoading={this.state.isLoading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                sortBy={this.state.sortBy}
                sortOrder={this.state.sortOrder}
                sortItems={this.sortItems}
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
    const { isLoading, errorMsg, items, sortBy, sortOrder } = this.props;
    
    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    const sortIcon = <span className={`fas ${sortOrder == 'asc' ? 'fa-caret-up' : 'fa-caret-down'}`}></span>;
    return mode == 'list' ? (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="5%"></th>
            <th width="55%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortBy == 'name' && sortIcon}</a></th>
            <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBy == 'size' && sortIcon}</a></th>
            <th width="16%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortBy == 'time' && sortIcon}</a></th>
            <th width="10%"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            return <Item 
              key={index}
              item={item}
              zipDownloadFolder={this.props.zipDownloadFolder}
              showImagePopup={this.props.showImagePopup}
            />;
          })}
        </tbody>
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
      return (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
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
      );
    } else {
      const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
      const thumbnailURL = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}` : '';
      return (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
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
            <a className={`action-icon sf2-icon-download${isIconShown ? '' : ' invisible'}`} href={`${fileURL}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
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
