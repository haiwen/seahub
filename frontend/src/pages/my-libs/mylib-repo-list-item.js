import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, storages } from '../../utils/constants';
import ModalPortal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import toaster from '../../components/toast';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import TransferDialog from '../../components/dialog/transfer-dialog';
import ChangeRepoPasswordDialog from '../../components/dialog/change-repo-password-dialog';
import ResetEncryptedRepoPasswordDialog from '../../components/dialog/reset-encrypted-repo-password-dialog';
import LabelRepoStateDialog from '../../components/dialog/label-repo-state-dialog';
import LibSubFolderPermissionDialog from '../../components/dialog/lib-sub-folder-permission-dialog';
import Rename from '../../components/rename';
import MylibRepoMenu from './mylib-repo-menu';
import RepoAPITokenDialog from '../../components/dialog/repo-api-token-dialog';
import RepoShareAdminDialog from '../../components/dialog/repo-share-admin-dialog';
import OfficeSuiteDialog from '../../components/dialog/repo-office-suite-dialog';
import RepoMonitoredIcon from '../../components/repo-monitored-icon';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import { userAPI } from '../../utils/user-api';

const propTypes = {
  currentViewMode: PropTypes.string,
  repo: PropTypes.object.isRequired,
  inAllLibs: PropTypes.bool,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onMonitorRepo: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

dayjs.extend(relativeTime);

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
      isChangePasswordDialogShow: false,
      isResetPasswordDialogShow: false,
      isLabelRepoStateDialogOpen: false,
      isFolderPermissionDialogShow: false,
      isAPITokenDialogShow: false,
      isRepoShareAdminDialogOpen: false,
      isRepoDeleted: false,
      isOfficeSuiteDialogShow: false,
    };
  }

  onFocus = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShow: true
      });
    }
  };

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShow: true,
        highlight: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShow: false,
        highlight: false
      });
    }
  };

  onMenuItemClick = (item) => {
    switch (item) {
      case 'Star':
      case 'Unstar':
        this.onToggleStarRepo();
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
      case 'Change Password':
        this.onChangePasswordToggle();
        break;
      case 'Reset Password':
        this.onResetPasswordToggle();
        break;
      case 'Watch File Changes':
        this.watchFileChanges();
        break;
      case 'Unwatch File Changes':
        this.unwatchFileChanges();
        break;
      case 'Folder Permission':
        this.onFolderPermissionToggle();
        break;
      case 'Label Current State':
        this.onLabelToggle();
        break;
      case 'API Token':
        this.onAPITokenToggle();
        break;
      case 'Share Admin':
        this.toggleRepoShareAdminDialog();
        break;
      case 'Office Suite':
        this.onOfficeSuiteToggle();
        break;
      default:
        break;
    }
  };

  visitRepo = () => {
    if (!this.state.isRenaming && this.props.repo.repo_name) {
      navigate(this.repoURL);
    }
  };

  onToggleStarRepo = () => {
    const repoName = this.props.repo.repo_name;
    if (this.state.isStarred) {
      seafileAPI.unstarItem(this.props.repo.repo_id, '/').then(() => {
        this.setState({ isStarred: !this.state.isStarred });
        const msg = gettext('Successfully unstarred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(this.props.repo.repo_id, '/').then(() => {
        this.setState({ isStarred: !this.state.isStarred });
        const msg = gettext('Successfully starred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  watchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.monitorRepo(repo.repo_id).then(() => {
      this.props.onMonitorRepo(repo, true);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unwatchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.unMonitorRepo(repo.repo_id).then(() => {
      this.props.onMonitorRepo(repo, false);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onShareToggle = () => {
    this.setState({ isShareDialogShow: !this.state.isShareDialogShow });
  };

  onDeleteToggle = () => {
    this.setState({ isDeleteDialogShow: !this.state.isDeleteDialogShow });
  };

  onRenameToggle = () => {
    this.props.onFreezedItem();
    this.setState({ isRenaming: !this.state.isRenaming });
  };

  onTransferToggle = () => {
    this.setState({ isTransferDialogShow: !this.state.isTransferDialogShow });
  };

  onChangePasswordToggle = () => {
    this.setState({ isChangePasswordDialogShow: !this.state.isChangePasswordDialogShow });
  };

  onResetPasswordToggle = () => {
    this.setState({ isResetPasswordDialogShow: !this.state.isResetPasswordDialogShow });
  };

  onLabelToggle = () => {
    this.setState({ isLabelRepoStateDialogOpen: !this.state.isLabelRepoStateDialogOpen });
  };

  onFolderPermissionToggle = () => {
    this.setState({ isFolderPermissionDialogShow: !this.state.isFolderPermissionDialogShow });
  };

  onAPITokenToggle = () => {
    this.setState({ isAPITokenDialogShow: !this.state.isAPITokenDialogShow });
  };

  onOfficeSuiteToggle = () => {
    this.setState({ isOfficeSuiteDialogShow: !this.state.isOfficeSuiteDialogShow });
  };

  toggleRepoShareAdminDialog = () => {
    this.setState({ isRepoShareAdminDialogOpen: !this.state.isRepoShareAdminDialogOpen });
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false,
    });
    this.props.onUnfreezedItem();
  };

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
  };

  onRenameCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({ isRenaming: !this.state.isRenaming });
  };

  onTransferRepo = (email, reshare) => {
    let repoID = this.props.repo.repo_id;
    userAPI.transferRepo(repoID, email, reshare).then(res => {
      this.props.onTransferRepo(repoID);
      let message = gettext('Successfully transferred the library.');
      toaster.success(message);
    }).catch(error => {
      if (error.response) {
        toaster.danger(error.response.data.error_msg || gettext('Error'), { duration: 3 });
      } else {
        toaster.danger(gettext('Failed. Please check the network.'), { duration: 3 });
      }
    });
  };

  onDeleteRepo = (repo) => {
    seafileAPI.deleteRepo(repo.repo_id).then((res) => {

      this.setState({
        isRepoDeleted: true,
        isDeleteDialogShow: false,
      });

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

      this.setState({ isRepoDeleted: false });
    });
  };

  handleContextMenu = (event) => {
    this.props.onContextMenu(event, this.props.repo);
  };

  renderPCUI = () => {
    const { isStarred } = this.state;
    const { repo, currentViewMode = LIST_MODE, inAllLibs } = this.props;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let repoURL = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;
    return currentViewMode == LIST_MODE ? (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onFocus} onContextMenu={this.handleContextMenu}>
        <td className="text-center">
          <i
            role="button"
            title={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
            aria-label={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
            onClick={this.onToggleStarRepo}
            className={`${this.state.isStarred ? 'sf3-font-star' : 'sf3-font-star-empty'} sf3-font`}
          >
          </i>
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
            <Fragment>
              <Link to={repoURL}>{repo.repo_name}</Link>
              {repo.monitored && <RepoMonitoredIcon repoID={repo.repo_id} className="ml-1 op-icon" />}
            </Fragment>
          )}
          {!this.state.isRenaming && !repo.repo_name &&
            (gettext('Broken (please contact your administrator to fix this library)'))
          }
        </td>
        <td>
          {(repo.repo_name && this.state.isOpIconShow) && (
            <div className="d-flex align-items-center">
              <i className="op-icon sf3-font-share sf3-font" title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.onShareToggle}></i>
              <i className="op-icon sf3-font-delete1 sf3-font" title={gettext('Delete')} role="button" aria-label={gettext('Delete')} onClick={this.onDeleteToggle}></i>
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
        {(storages.length > 0 && !inAllLibs) && <td>{repo.storage_name}</td>}
        <td title={dayjs(repo.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(repo.last_modified).fromNow()}</td>
      </tr>
    ) : (
      <div
        className="library-grid-item px-3 d-flex justify-content-between align-items-center"
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onFocus}
        onContextMenu={this.handleContextMenu}
      >
        <div className="d-flex align-items-center text-truncate">
          <img src={iconUrl} title={iconTitle} alt={iconTitle} width="36" className="mr-2" />
          {this.state.isRenaming && (
            <Rename
              name={repo.repo_name}
              onRenameConfirm={this.onRenameConfirm}
              onRenameCancel={this.onRenameCancel}
            />
          )}
          {!this.state.isRenaming && repo.repo_name && (
            <Fragment>
              <Link to={repoURL} className="library-name text-truncate" title={repo.repo_name}>{repo.repo_name}</Link>
              {isStarred &&
                <i
                  role="button"
                  title={gettext('Unstar')}
                  aria-label={gettext('Unstar')}
                  className='op-icon library-grid-item-icon sf3-font-star sf3-font'
                  onClick={this.onToggleStarRepo}
                >
                </i>
              }
              {repo.monitored && <RepoMonitoredIcon repoID={repo.repo_id} className="op-icon library-grid-item-icon" />}
            </Fragment>
          )}
          {!this.state.isRenaming && !repo.repo_name &&
            (<span>{gettext('Broken (please contact your administrator to fix this library)')}</span>)
          }
        </div>
        {(repo.repo_name && this.state.isOpIconShow) && (
          <div className="flex-shrink-0 d-flex align-items-center">
            <i className="op-icon sf3-font-share sf3-font" title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.onShareToggle}></i>
            <i className="op-icon sf3-font-delete1 sf3-font" title={gettext('Delete')} role="button" aria-label={gettext('Delete')} onClick={this.onDeleteToggle}></i>
            <MylibRepoMenu
              isPC={true}
              repo={this.props.repo}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
          </div>
        )}
      </div>
    );
  };

  renderMobileUI = () => {
    let repo = this.props.repo;
    let iconUrl = Utils.getLibIconUrl(repo);
    let iconTitle = Utils.getLibIconTitle(repo);
    let repoURL = this.repoURL = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td onClick={this.visitRepo}><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td onClick={this.visitRepo}>
          {this.state.isRenaming && (
            <Rename
              name={repo.repo_name}
              onRenameConfirm={this.onRenameConfirm}
              onRenameCancel={this.onRenameCancel}
            />
          )}
          {!this.state.isRenaming && repo.repo_name && (
            <div>
              <Link to={repoURL}>{repo.repo_name}</Link>
              {repo.monitored && <RepoMonitoredIcon repoID={repo.repo_id} className="ml-1 op-icon" />}
            </div>
          )}
          {!this.state.isRenaming && !repo.repo_name &&
            <div>(gettext('Broken (please contact your administrator to fix this library)'))</div>
          }
          <span className="item-meta-info">{repo.size}</span>
          <span className="item-meta-info" title={dayjs(repo.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(repo.last_modified).fromNow()}</span>
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
  };

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
              repo={repo}
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
              isRepoDeleted={this.state.isRepoDeleted}
              onDeleteRepo={this.onDeleteRepo}
              toggle={this.onDeleteToggle}
              isGetShare={true}
            />
          </ModalPortal>
        )}
        {this.state.isTransferDialogShow && (
          <ModalPortal>
            <TransferDialog
              itemName={repo.repo_name}
              onTransferRepo={this.onTransferRepo}
              toggleDialog={this.onTransferToggle}
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

        {this.state.isAPITokenDialogShow && (
          <ModalPortal>
            <RepoAPITokenDialog
              repo={repo}
              onRepoAPITokenToggle={this.onAPITokenToggle}
            />
          </ModalPortal>
        )}

        {this.state.isRepoShareAdminDialogOpen && (
          <ModalPortal>
            <RepoShareAdminDialog
              repo={repo}
              toggleDialog={this.toggleRepoShareAdminDialog}
            />
          </ModalPortal>
        )}

        {this.state.isOfficeSuiteDialogShow && (
          <ModalPortal>
            <OfficeSuiteDialog
              repoID={repo.repo_id}
              repoName={repo.repo_name}
              toggleDialog={this.onOfficeSuiteToggle}
            />
          </ModalPortal>
        )}

      </Fragment>
    );
  }
}

MylibRepoListItem.propTypes = propTypes;

export default MylibRepoListItem;
