import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import Toast from '../toast';
import DirentMenu from './dirent-menu';
import DirentRename from './dirent-rename';
import ModalPortal from '../modal-portal';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ShareDialog from '../dialog/share-dialog';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onItemRenameToggle: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  currentRepo: PropTypes.object,
  isRepoOwner: PropTypes.bool,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      highlight: false,
      isItemMenuShow: false,
      menuPosition: {top: 0, left: 0 },
      progress: 0,
      isProgressDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isShareDialogShow: false,
      isMutipleOperation: false,
    };
    this.zipToken = null;
  }

  componentDidMount() {
    document.addEventListener('click', this.onItemMenuHide);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onItemMenuHide);
  }

  //UI Interactive
  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
  }

  onItemMenuToggle = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (!this.state.isItemMenuShow) {
      this.onItemMenuShow(e);
    } else {
      this.onItemMenuHide();
    }
  }

  onItemMenuShow = (e) => {
    let left = e.clientX;
    let top  = e.clientY;
    let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
    this.setState({
      menuPosition: position,
      isItemMenuShow: true,
    });
    this.props.onFreezedItem();
  }

  onItemMenuHide = () => {
    this.setState({
      isOperationShow: false,
      highlight: '',
      isItemMenuShow: false,
      isRenameing: false,
    });
    this.props.onUnfreezedItem();
  }

  //buiness handler
  onItemSelected = () => {
    this.props.onItemSelected(this.props.dirent);
  }

  onItemStarred = () => {
    let dirent = this.props.dirent;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);
    if (dirent.starred) {
      seafileAPI.unStarFile(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', false);
      });
    } else {
      seafileAPI.starFile(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', true);
      });
    }
  }

  onItemClick = (e) => {
    e.preventDefault();
    this.props.onItemClick(this.props.dirent);
  }

  onItemDelete = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemDelete(this.props.dirent);
  }

  onItemShare = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.setState({
      isShareDialogShow: !this.state.isShareDialogShow
    });
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
    case 'Rename':
      this.onItemRenameToggle();
      break;
    case 'Move':
      this.onItemMoveToggle();
      break;
    case 'Copy':
      this.onItemCopyToggle();
      break;
    case 'Permission':
      this.onPermissionItem();
      break;
    case 'Details':
      this.onDetailsItem();
      break;
    case 'Unlock':
      this.onUnlockItem();
      break;
    case 'Lock':
      this.onLockItem();
      break;
    case 'New Draft':
      this.onNewDraft();
      break;
    case 'Comment':
      this.onComnentItem();
      break;
    case 'History':
      this.onHistory();
      break;
    case 'Access Log':
      this.onAccessLog();
      break;
    case 'Open via Client':
      this.onOpenViaClient();
      break;
    default:
      break;
    }
  }

  onItemRenameToggle = () => {
    this.props.onItemRenameToggle(this.props.dirent);
    this.setState({
      isOperationShow: false,
      isItemMenuShow: false,
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    if (newName === this.props.dirent.name) {
      this.onRenameCancel();
      return false;
    }

    if (!newName) {
      let errMessage = 'It is required.';
      Toast.error(gettext(errMessage));
      return false;
    }

    if (newName.indexOf('/') > -1) {
      let errMessage = 'Name should not include ' + '\'/\'' + '.';
      Toast.error(gettext(errMessage));
      return false;
    }

    this.props.onItemRename(this.props.dirent, newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.setState({
      isRenameing: false,
    });
    this.props.onUnfreezedItem();
  }

  onItemMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
    this.onItemMenuHide();
  }

  onItemCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
    this.onItemMenuHide();
  }

  onPermissionItem = () => {

  }

  onDetailsItem = () => {
    this.props.onItemDetails(this.props.dirent);
    this.onItemMenuHide();
  }

  onLockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', true);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', true);
    });
    this.onItemMenuHide();
  }

  onUnlockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', false);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', false);
    });
    this.onItemMenuHide();
  }

  onNewDraft = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.createDraft(repoID, filePath).then(res => {
      let draft_file_Path = res.data.draft_file_path;
      let draftId = res.data.id;
      let url = URLDecorator.getUrl({type: 'draft_view', repoID: repoID, filePath: draft_file_Path, draftId: draftId});
      let newWindow = window.open('draft');
      newWindow.location.href = url;
    }).catch(() => {
      Toast.error('Create draft failed.');
    });
    this.onItemMenuHide();
  }

  onComnentItem = () => {

  }

  onHistory = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let referer = location.href;
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath, referer: referer});
    location.href = url;
    this.onItemMenuHide();
  }

  onAccessLog = () => {

  }

  onOpenViaClient = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
    this.onItemMenuHide();
  }

  onItemDownload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let dirent = this.props.dirent;
    let repoID = this.props.repoID;
    let direntPath = this.getDirentPath(dirent);
    if (dirent.type === 'dir') {
      this.setState({isProgressDialogShow: true, progress: 0});
      seafileAPI.zipDownload(repoID, this.props.path, dirent.name).then(res => {
        this.zipToken = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      }).catch(() => {
        clearInterval(this.interval);
        // Toast.error(gettext(''));
        //todo;
      });
    } else {
      let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
      location.href = url;
    }
  }

  addDownloadAnimation = () => {
    let _this = this;
    let token = this.zipToken;
    seafileAPI.queryZipProgress(token).then(res => {
      let data = res.data;
      let progress = data.total === 0 ? 100 : (data.zipped / data.total * 100).toFixed(0);
      this.setState({progress: parseInt(progress)});

      if (data['total'] === data['zipped']) {
        this.setState({
          progress: 100
        });
        clearInterval(this.interval);
        location.href = URLDecorator.getUrl({type: 'download_dir_zip_url', token: token});
        setTimeout(function() {
          _this.setState({isProgressDialogShow: false});
        }, 500);
      }

    });
  }

  onCancelDownload = () => {
    let zipToken = this.zipToken;
    seafileAPI.cancelZipTask(zipToken).then(res => {
      this.setState({
        isProgressDialogShow: false,
      });
    });
  }

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  }

  render() {
    let { path, dirent } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let href = siteRoot + 'wiki/lib/' + this.props.repoID + direntPath;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
          <td className="select">
            <input type="checkbox" className="vam" onChange={this.onItemSelected} checked={dirent.isSelected}/>
          </td>
          <td className="star" onClick={this.onItemStarred}>
            {dirent.starred !== undefined && !dirent.starred && <i className="far fa-star empty"></i>}
            {dirent.starred !== undefined && dirent.starred && <i className="fas fa-star"></i>}
          </td>
          <td className="icon">
            <div className="dir-icon">
              <img src={dirent.type === 'dir' ? siteRoot + 'media/img/folder-192.png' : siteRoot + 'media/img/file/192/txt.png'} alt={gettext('file icon')}></img>
              {dirent.is_locked && <img className="locked" src={siteRoot + 'media/img/file-locked-32.png'} alt={gettext('locked')}></img>}
            </div>
          </td>
          <td className="name">
            {this.state.isRenameing ?
              <DirentRename dirent={dirent} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
              <a href={href} onClick={this.onItemClick}>{dirent.name}</a>
            }
          </td>
          <td>
            <div className="dirent-item tag-list tag-list-stacked ">
              { dirent.type !== 'dir' && dirent.file_tags.map((fileTag) => {
                return (
                  <span className={`file-tag bg-${fileTag.color}`} key={fileTag.id} title={fileTag.name}></span>
                );
              })}
            </div>
          </td>
          <td className="operation">
            {
              this.state.isOperationShow &&
              <div className="operations">
                <ul className="operation-group">
                  <li className="operation-group-item">
                    <i className="sf2-icon-download" title={gettext('Download')} onClick={this.onItemDownload}></i>
                  </li>
                  <li className="operation-group-item">
                    <i className="sf2-icon-share" title={gettext('Share')} onClick={this.onItemShare}></i>
                  </li>
                  <li className="operation-group-item">
                    <i className="sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemDelete}></i>
                  </li>
                  <li className="operation-group-item">
                    <i className="sf2-icon-caret-down sf-dropdown-toggle" title={gettext('More Operation')} onClick={this.onItemMenuToggle}></i>
                  </li>
                </ul>
                {
                  this.state.isItemMenuShow &&
                  <DirentMenu
                    dirent={this.props.dirent}
                    menuPosition={this.state.menuPosition}
                    onMenuItemClick={this.onMenuItemClick}
                    currentRepo={this.props.currentRepo}
                    isRepoOwner={this.props.isRepoOwner}
                  />
                }
              </div>
            }
          </td>
          <td className="file-size">{dirent.size && dirent.size}</td>
          <td className="last-update" dangerouslySetInnerHTML={{__html: dirent.mtime}}></td>
        </tr>
        {this.state.isMoveDialogShow &&
          <ModalPortal>
            <MoveDirentDialog
              path={this.props.path}
              repoID={this.props.repoID}
              dirent={this.props.dirent}
              isMutipleOperation={this.state.isMutipleOperation}
              onItemMove={this.props.onItemMove}
              onCancelMove={this.onItemMoveToggle}
            />
          </ModalPortal>
        }
        {this.state.isCopyDialogShow &&
          <ModalPortal>
            <CopyDirentDialog
              path={this.props.path}
              repoID={this.props.repoID}
              dirent={this.props.dirent}
              isMutipleOperation={this.state.isMutipleOperation}
              onItemCopy={this.props.onItemCopy}
              onCancelCopy={this.onItemCopyToggle}
            />
          </ModalPortal>
        }
        {this.state.isProgressDialogShow &&
          <ModalPortal>
            <ZipDownloadDialog 
              progress={this.state.progress} 
              onCancelDownload={this.onCancelDownload}
            />
          </ModalPortal>
        }
        {this.state.isShareDialogShow &&
          <ModalPortal>
            <ShareDialog itemPath={direntPath}
                         itemName={dirent.name}
                         toggleDialog={this.onItemShare}
                         isOpen={this.state.isShareDialogShow}
                         repoID={this.props.repoID}
                         isDir={dirent.isDir()}
                         />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
