import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import moment from 'moment';
import { Link } from '@reach/router';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, storages } from '../../utils/constants';
import ModalPortal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import toaster from '../../components/toast';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import TransferDialog from '../../components/dialog/transfer-dialog';
import LibHistorySettingDialog from '../../components/dialog/lib-history-setting-dialog';
import ChangeRepoPasswordDialog from '../../components/dialog/change-repo-password-dialog';
import ResetEncryptedRepoPasswordDialog from '../../components/dialog/reset-encrypted-repo-password-dialog';
import LabelRepoStateDialog from '../../components/dialog/label-repo-state-dialog';
import LibSubFolderPermissionDialog from '../../components/dialog/lib-sub-folder-permission-dialog';
import Rename from '../../components/rename';
import MylibRepoMenu from './mylib-repo-menu';

const propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onRepoClick: PropTypes.func.isRequired,
};

class MylibRepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShow: false,
      isStarred: this.props.repo.starred,
      isRenaming: false,
      isShareDialogShow: false,
      isDeleteDialogShow: false,
      isTransferDialogShow: false,
      isHistorySettingDialogShow: false,
      isChangePasswordDialogShow: false,
      isResetPasswordDialogShow: false,
      isLabelRepoStateDialogOpen: false,
      isFolderPermissionDialogShow: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShow: true,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShow: false,
        highlight: false
      });
    }
  }

  onMenuItemClick = (item) => {
    switch(item) {
      case 'Star':
      case 'Unstar':
        this.onStarRepo();
        break;
      case 'Share':
        this.onShareToggle();
        break;
      case 'Delete':
        this.onDeleteToggle();
        break;
      case 'Rename':
        this.onRenameToggle();
        break;
      case 'Transfer':
        this.onTransferToggle();
        break;
      case 'History Setting':
        this.onHistorySettingToggle();
        break;
      case 'Change Password':
        this.onChangePasswordToggle();
        break;
      case 'Reset Password':
        this.onResetPasswordToggle();
        break;
      case 'Folder Permission':
        this.onFolderPermissionToggle();
        break;
      case 'Label Current State':
        this.onLabelToggle();
        break;
      default:
        break;
    }
  }

  onRepoClick = () => {
    this.props.onRepoClick(this.props.repo);
  }

  onStarRepo = () => {
    const repoName = this.props.repo.repo_name;
    if (this.state.isStarred) {
      seafileAPI.unstarItem(this.props.repo.repo_id, '/').then(() => {
        this.setState({isStarred: !this.state.isStarred});
        if (window.innerWidth < 768) {
          const msg = gettext('Successfully unstarred {library_name_placeholder}.')
            .replace('{library_name_placeholder}', repoName);
          toaster.success(msg);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(this.props.repo.repo_id, '/').then(() => {
        this.setState({isStarred: !this.state.isStarred});
        if (window.innerWidth < 768) {
          const msg = gettext('Successfully starred {library_name_placeholder}.')
            .replace('{library_name_placeholder}', repoName);
          toaster.success(msg);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onShareToggle = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  onDeleteToggle = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
  }

  onRenameToggle = () => {
    this.props.onFreezedItem();
    this.setState({isRenaming: !this.state.isRenaming});
  }

  onTransferToggle = () => {
    this.setState({isTransferDialogShow: !this.state.isTransferDialogShow});
  }

  onHistorySettingToggle = () => {
    this.setState({isHistorySettingDialogShow: !this.state.isHistorySettingDialogShow});
  }

  onChangePasswordToggle = () => {
    this.setState({isChangePasswordDialogShow: !this.state.isChangePasswordDialogShow});
  }

  onResetPasswordToggle = () => {
    this.setState({isResetPasswordDialogShow: !this.state.isResetPasswordDialogShow});
  }

  onLabelToggle = () => {
    this.setState({isLabelRepoStateDialogOpen: !this.state.isLabelRepoStateDialogOpen});
  }

  onFolderPermissionToggle = () => {
    this.setState({isFolderPermissionDialogShow: !this.state.isFolderPermissionDialogShow});
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false,
    });
    this.props.onUnfreezedItem();
  }

  onRenameConfirm = (newName) => {
    let repo = this.props.repo;
    let repoID = repo.repo_id;
    seafileAPI.renameRepo(repoID, newName).then(() => {
      this.props.onRenameRepo(repo, newName);
      this.onRenameCancel();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onRenameCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({isRenaming: !this.state.isRenaming});
  }

  onTransferRepo = (user) => {
    let repoID = this.props.repo.repo_id;
    seafileAPI.transferRepo(repoID, user.email).then(res => {
      this.props.onTransferRepo(repoID);
      let message = gettext('Successfully transferred the library.');
      toaster.success(message);
    }).catch(error => {
      if (error.response){
        toaster.danger(error.response.data.error_msg || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Failed. Please check the network.'), {duration: 3});
      }
    });
    this.onTransferToggle();
  }

  onDeleteRepo = (repo) => {
    seafileAPI.deleteRepo(repo.repo_id).then((res) => {
      this.props.onDeleteRepo(repo);
      let name = repo.repo_name;
      var msg = gettext('Successfully deleted {name}.').replace('{name}', name);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = repo.repo_name;
        errMessage = gettext('Failed to delete {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage);
    });
  }

  renderPCUI = () => {
    let repo = this.props.repo;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let repoURL = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onClick={this.onRepoClick}>
        <td className="text-center">
          {!this.state.isStarred && <i className="far fa-star star-empty cursor-pointer" onClick={this.onStarRepo}></i>}
          {this.state.isStarred && <i className="fas fa-star cursor-pointer" onClick={this.onStarRepo}></i>}
        </td>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td>
          {this.state.isRenaming && (
            <Rename
              name={repo.repo_name}
              onRenameConfirm={this.onRenameConfirm}
              onRenameCancel={this.onRenameCancel}
            />
          )}
          {!this.state.isRenaming && repo.repo_name && (
            <Link to={repoURL}>{repo.repo_name}</Link>
          )}
          {!this.state.isRenaming && !repo.repo_name &&
            (gettext('Broken (please contact your administrator to fix this library)'))
          }
        </td>
        <td>
          {(repo.repo_name && this.state.isOpIconShow) && (
            <div>
              <a href="#" className="op-icon sf2-icon-share" title={gettext('Share')} onClick={this.onShareToggle}></a>
              <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onDeleteToggle}></a>
              <MylibRepoMenu
                isPC={true}
                repo={this.props.repo}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            </div>
          )}
        </td>
        <td>{repo.size}</td>
        {storages.length > 0 && <td>{repo.storage_name}</td>}
        <td title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</td>
      </tr>
    );
  }

  renderMobileUI = () => {
    let repo = this.props.repo;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let repoURL = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''}  onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onClick={this.onRepoClick}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td>
          {this.state.isRenaming && (
            <Rename
              name={repo.repo_name}
              onRenameConfirm={this.onRenameConfirm}
              onRenameCancel={this.onRenameCancel}
            />
          )}
          {!this.state.isRenaming && repo.repo_name && (
            <div><Link to={repoURL}>{repo.repo_name}</Link></div>
          )}
          {!this.state.isRenaming && !repo.repo_name &&
            <div>(gettext('Broken (please contact your administrator to fix this library)'))</div>
          }
          <span className="item-meta-info">{repo.size}</span>
          <span className="item-meta-info" title={moment(repo.last_modified).format('llll')}>{moment(repo.last_modified).fromNow()}</span>
        </td>
        <td>
          {repo.repo_name && (
            <MylibRepoMenu
              repo={this.props.repo}
              isStarred={this.state.isStarred}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
          )}
        </td>
      </tr>
    );
  }

  render() {
    let repo = this.props.repo;
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          {this.renderPCUI()}
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {this.renderMobileUI()}
        </MediaQuery>
        {this.state.isShareDialogShow && (
          <ModalPortal>
            <ShareDialog
              itemType={'library'}
              itemName={repo.repo_name}
              itemPath={'/'}
              repoID={repo.repo_id}
              repoEncrypted={repo.encrypted}
              enableDirPrivateShare={true}
              userPerm={repo.permission}
              toggleDialog={this.onShareToggle}
            />
          </ModalPortal>
        )}
        {this.state.isDeleteDialogShow && (
          <ModalPortal>
            <DeleteRepoDialog
              repo={repo}
              onDeleteRepo={this.onDeleteRepo}
              toggle={this.onDeleteToggle}
            />
          </ModalPortal>
        )}
        {this.state.isTransferDialogShow && (
          <ModalPortal>
            <TransferDialog
              itemName={repo.repo_name}
              submit={this.onTransferRepo}
              toggleDialog={this.onTransferToggle}
            />
          </ModalPortal>
        )}
        {this.state.isHistorySettingDialogShow && (
          <ModalPortal>
            <LibHistorySettingDialog
              repoID={repo.repo_id}
              itemName={repo.repo_name}
              toggleDialog={this.onHistorySettingToggle}
            />
          </ModalPortal>
        )}
        {this.state.isChangePasswordDialogShow && (
          <ModalPortal>
            <ChangeRepoPasswordDialog
              repoID={repo.repo_id}
              repoName={repo.repo_name}
              toggleDialog={this.onChangePasswordToggle}
            />
          </ModalPortal>
        )}
        {this.state.isResetPasswordDialogShow && (
          <ModalPortal>
            <ResetEncryptedRepoPasswordDialog
              repoID={repo.repo_id}
              toggleDialog={this.onResetPasswordToggle}
            />
          </ModalPortal>
        )}

        {this.state.isLabelRepoStateDialogOpen && (
          <ModalPortal>
            <LabelRepoStateDialog
              repoID={repo.repo_id}
              repoName={repo.repo_name}
              toggleDialog={this.onLabelToggle}
            />
          </ModalPortal>
        )}

        {this.state.isFolderPermissionDialogShow && (
          <ModalPortal>
            <LibSubFolderPermissionDialog
              toggleDialog={this.onFolderPermissionToggle}
              repoID={repo.repo_id}
              repoName={repo.repo_name}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

MylibRepoListItem.propTypes = propTypes;

export default MylibRepoListItem;
