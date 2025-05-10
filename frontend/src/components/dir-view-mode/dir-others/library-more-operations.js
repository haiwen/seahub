import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import ModalPortal from '../../../components/modal-portal';
import toaster from '../../../components/toast';
import RenameRepoDialog from '../../../components/dialog/rename-repo';
import TransferDialog from '../../../components/dialog/transfer-dialog';
import ChangeRepoPasswordDialog from '../../../components/dialog/change-repo-password-dialog';
import ResetEncryptedRepoPasswordDialog from '../../../components/dialog/reset-encrypted-repo-password-dialog';
import LabelRepoStateDialog from '../../../components/dialog/label-repo-state-dialog';
import LibSubFolderPermissionDialog from '../../../components/dialog/lib-sub-folder-permission-dialog';
import RepoAPITokenDialog from '../../../components/dialog/repo-api-token-dialog';
import RepoShareAdminDialog from '../../../components/dialog/repo-share-admin-dialog';
import OfficeSuiteDialog from '../../../components/dialog/repo-office-suite-dialog';
import { userAPI } from '../../../utils/user-api';
import MylibRepoMenu from '../../../pages/my-libs/mylib-repo-menu';

const propTypes = {
  repo: PropTypes.object.isRequired,
  updateRepoInfo: PropTypes.func.isRequired
};

class LibraryMoreOperations extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isRenameRepoDialogOpen: false,
      isTransferDialogOpen: false,
      isChangePasswordDialogOpen: false,
      isResetPasswordDialogOpen: false,
      isLabelRepoStateDialogOpen: false,
      isFolderPermissionDialogOpen: false,
      isAPITokenDialogOpen: false,
      isRepoShareAdminDialogOpen: false,
      isOfficeSuiteDialogOpen: false
    };
  }

  onMenuItemClick = (item) => {
    switch (item) {
      case 'Rename':
        this.onRenameToggle();
        break;
      case 'Transfer':
        this.onTransferToggle();
        break;
      case 'Folder Permission':
        this.onFolderPermissionToggle();
        break;
      case 'Share Admin':
        this.toggleRepoShareAdminDialog();
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
      case 'API Token':
        this.onAPITokenToggle();
        break;
      case 'Label Current State':
        this.onLabelToggle();
        break;
      case 'Office Suite':
        this.onOfficeSuiteToggle();
        break;
      default:
        break;
    }
  };

  watchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.monitorRepo(repo.repo_id).then(() => {
      this.props.updateRepoInfo({ 'monitored': true });
      const message = gettext('Successfully watched the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unwatchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.unMonitorRepo(repo.repo_id).then(() => {
      this.props.updateRepoInfo({ 'monitored': false });
      const message = gettext('Successfully unwatched the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onRenameToggle = () => {
    this.setState({ isRenameRepoDialogOpen: !this.state.isRenameRepoDialogOpen });
  };

  onTransferToggle = () => {
    this.setState({ isTransferDialogOpen: !this.state.isTransferDialogOpen });
  };

  onChangePasswordToggle = () => {
    this.setState({ isChangePasswordDialogOpen: !this.state.isChangePasswordDialogOpen });
  };

  onResetPasswordToggle = () => {
    this.setState({ isResetPasswordDialogOpen: !this.state.isResetPasswordDialogOpen });
  };

  onLabelToggle = () => {
    this.setState({ isLabelRepoStateDialogOpen: !this.state.isLabelRepoStateDialogOpen });
  };

  onFolderPermissionToggle = () => {
    this.setState({ isFolderPermissionDialogOpen: !this.state.isFolderPermissionDialogOpen });
  };

  onAPITokenToggle = () => {
    this.setState({ isAPITokenDialogOpen: !this.state.isAPITokenDialogOpen });
  };

  onOfficeSuiteToggle = () => {
    this.setState({ isOfficeSuiteDialogOpen: !this.state.isOfficeSuiteDialogOpen });
  };

  toggleRepoShareAdminDialog = () => {
    this.setState({ isRepoShareAdminDialogOpen: !this.state.isRepoShareAdminDialogOpen });
  };

  renameRepo = (newName) => {
    const { repo } = this.props;
    const { repo_id: repoID } = repo;
    seafileAPI.renameRepo(repoID, newName).then((res) => {
      this.props.updateRepoInfo({ 'repo_name': newName });
      const message = gettext('Successfully renamed the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onTransferRepo = (email, reshare) => {
    const { repo } = this.props;
    const { repo_id: repoID } = repo;
    userAPI.transferRepo(repoID, email, reshare).then(res => {
      const message = gettext('Successfully transferred the library.');
      toaster.success(message);
      navigate(siteRoot);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { repo } = this.props;
    const {
      isRenameRepoDialogOpen, isTransferDialogOpen
    } = this.state;
    return (
      <Fragment>
        <MylibRepoMenu
          isPC={true}
          isLibView={true}
          repo={repo}
          onMenuItemClick={this.onMenuItemClick}
        >
          <>
            <span className="sf3-font-more sf3-font"></span>
            <span className="dir-others-item-text">{gettext('More')}</span>
          </>
        </MylibRepoMenu>
        {isRenameRepoDialogOpen && (
          <ModalPortal>
            <RenameRepoDialog
              name={repo.repo_name}
              renameRepo={this.renameRepo}
              toggleDialog={this.onRenameToggle}
            />
          </ModalPortal>
        )}
        {isTransferDialogOpen && (
          <ModalPortal>
            <TransferDialog
              itemName={repo.repo_name}
              onTransferRepo={this.onTransferRepo}
              toggleDialog={this.onTransferToggle}
            />
          </ModalPortal>
        )}
        {this.state.isChangePasswordDialogOpen && (
          <ModalPortal>
            <ChangeRepoPasswordDialog
              repoID={repo.repo_id}
              repoName={repo.repo_name}
              toggleDialog={this.onChangePasswordToggle}
            />
          </ModalPortal>
        )}
        {this.state.isResetPasswordDialogOpen && (
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

        {this.state.isFolderPermissionDialogOpen && (
          <ModalPortal>
            <LibSubFolderPermissionDialog
              toggleDialog={this.onFolderPermissionToggle}
              repoID={repo.repo_id}
              repoName={repo.repo_name}
            />
          </ModalPortal>
        )}

        {this.state.isAPITokenDialogOpen && (
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

        {this.state.isOfficeSuiteDialogOpen && (
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

LibraryMoreOperations.propTypes = propTypes;

export default LibraryMoreOperations;
