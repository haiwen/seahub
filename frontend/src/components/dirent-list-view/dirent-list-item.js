import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'MD5';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, siteRoot, mediaUrl, canGenerateShareLink, canGenerateUploadLink } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import DirentMenu from './dirent-menu';
import Rename from '../rename';
import ModalPortal from '../modal-portal';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ShareDialog from '../dialog/share-dialog';

import '../../css/dirent-list-item.css';

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
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  currentRepoInfo: PropTypes.object,
  isRepoOwner: PropTypes.bool,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      highlight: false,
      progress: 0,
      isProgressDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isShareDialogShow: false,
      isMutipleOperation: false,
      isShowTagTooltip: false,
    };
    this.zipToken = null;
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

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOperationShow: false,
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
      seafileAPI.unStarItem(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', false);
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', true);
      });
    }
  }

  // on '<tr>'
  onDirentClick = (e) => {
    // '<td>' is clicked
    if (e.target.tagName == 'TD') {
      this.props.onDirentClick(this.props.dirent);
    }
  }

  onItemClick = (e) => {
    e.preventDefault();

    const dirent = this.props.dirent;
    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  }

  onItemDelete = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemDelete(this.props.dirent);
  }

  onItemShare = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  closeSharedDialog = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
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
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    this.props.onItemRename(this.props.dirent, newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.setState({isRenameing: false});
    this.props.onUnfreezedItem();
  }

  onItemMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onItemCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onPermissionItem = () => {

  }

  onDetailsItem = () => {
    this.props.onItemDetails(this.props.dirent);
  }

  onLockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', true);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', true);
    });
  }

  onUnlockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', false);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', false);
    });
  }

  onComnentItem = () => {

  }

  onHistory = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onAccessLog = () => {

  }

  onOpenViaClient = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
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

  onTagTooltipToggle = (e) => {
    e.stopPropagation();
    this.setState({isShowTagTooltip: !this.state.isShowTagTooltip});
  }

  render() {
    let { path, dirent } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + this.props.repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(direntPath);
    let toolTipID = MD5(dirent.name).slice(0, 7);
    let tagTitle = '';
    if (dirent.file_tags && dirent.file_tags.length > 0) {
      dirent.file_tags.forEach(item => {
        tagTitle += item.name + ' ';
      });
    }

    let iconUrl = Utils.getDirentIcon(dirent);

    const {repoEncrypted, isRepoOwner, isAdmin} = this.props;
    let showShare = false;
    if (!repoEncrypted &&
      (dirent.permission == 'rw' || dirent.permission == 'r')) {
      showShare = dirent.type == 'file' ? canGenerateShareLink :
        (canGenerateShareLink || canGenerateUploadLink || (isRepoOwner || isAdmin));
    }

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave} onClick={this.onDirentClick}>
          <td className="text-center">
            <input type="checkbox" className="vam" onChange={this.onItemSelected} checked={dirent.isSelected}/>
          </td>
          <td className="text-center">
            {dirent.starred !== undefined && !dirent.starred && <i className="far fa-star star-empty cursor-pointer" onClick={this.onItemStarred}></i>}
            {dirent.starred !== undefined && dirent.starred && <i className="fas fa-star cursor-pointer" onClick={this.onItemStarred}></i>}
          </td>
          <td className="text-center">
            <div className="dir-icon">
              {dirent.encoded_thumbnail_src ?
                <img src={`${siteRoot}${dirent.encoded_thumbnail_src}`} className="thumbnail" alt="" /> :
                <img src={iconUrl} width="24" alt='' />
              }
              {dirent.is_locked && <img className="locked" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={dirent.lock_owner}/>}
            </div>
          </td>
          <td className="name">
            {this.state.isRenameing ?
              <Rename hasSuffix={dirent.type !== 'dir'} name={dirent.name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} /> :
              <a href={dirent.type === 'dir' ? dirHref : fileHref} onClick={this.onItemClick}>{dirent.name}</a>
            }
          </td>
          <td className="tag-list-title">
            {(dirent.type !== 'dir' && dirent.file_tags) && (
              <Fragment>
                <div id={`tag-list-title-${toolTipID}`} className="dirent-item tag-list tag-list-stacked">
                  {dirent.file_tags.map((fileTag, index) => {
                    let length = dirent.file_tags.length;
                    return (
                      <span className={`file-tag bg-${fileTag.color}`} key={fileTag.id} style={{zIndex: length - index }}></span>
                    );
                  })}
                </div>
                <UncontrolledTooltip target={`tag-list-title-${toolTipID}`} placement="bottom">
                  {tagTitle}
                </UncontrolledTooltip>
              </Fragment>
            )} 
          </td>
          <td className="operation">
            {
              this.state.isOperationShow &&
              <div className="operations">
                <ul className="operation-group">
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemDownload}></i>
                  </li>
                  {showShare &&
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-share" title={gettext('Share')} onClick={this.onItemShare}></i>
                  </li>
                  }
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemDelete}></i>
                  </li>
                  <li className="operation-group-item">
                    <DirentMenu
                      dirent={this.props.dirent}
                      onMenuItemClick={this.onMenuItemClick}
                      currentRepoInfo={this.props.currentRepoInfo}
                      isRepoOwner={this.props.isRepoOwner}
                      onFreezedItem={this.props.onFreezedItem}
                      onUnfreezedItem={this.onUnfreezedItem}
                    />
                  </li>
                </ul>
              </div>
            }
          </td>
          <td className="file-size">{dirent.size && dirent.size}</td>
          <td className="last-update">{dirent.mtime_relative}</td>
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
            <ShareDialog 
              itemType={dirent.type}
              itemName={dirent.name}
              itemPath={direntPath}
              userPerm={dirent.permission}
              repoID={this.props.repoID}
              repoEncrypted={false}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              isAdmin={this.props.isAdmin}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.closeSharedDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
