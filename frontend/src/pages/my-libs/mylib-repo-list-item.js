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
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import TransferDialog from '../../components/dialog/transfer-dialog';
import LibHistorySettingDialog from '../../components/dialog/lib-history-setting-dialog';
import ChangeRepoPasswordDialog from '../../components/dialog/change-repo-password-dialog';
import ResetEncryptedRepoPasswordDialog from '../../components/dialog/reset-encrypted-repo-password-dialog';
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
  onRepoDetails: PropTypes.func.isRequired,
  onRepoClick: PropTypes.func.isRequired,
};

class MylibRepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShow: false,
      isRenaming: false,
      isShareDialogShow: false,
      isDeleteDialogShow: false,
      isTransferDialogShow: false,
      isHistorySettingDialogShow: false,
      isChangePasswordDialogShow: false,
      isResetPasswordDialogShow: false,
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
        // todo
        break;
      case 'Details':
        this.onRepoDetails();
        break;
      case 'Label current state':
        this.onLabel();
        break;
      default:
        break;
    }
  }

  onRepoClick = () => {
    this.props.onRepoClick(this.props.repo);
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

  onRepoDetails = () => {
    this.props.onRepoDetails(this.props.repo);
  }

  onLabel = () => {
    // todo
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
    });
  }

  onRenameCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({isRenaming: !this.state.isRenaming});
  }

  onTransferRepo = (repoID) => {
    this.onTransferToggle();
    this.props.onTransferRepo(repoID);
  }

  onDeleteRepo = (repo) => {
    seafileAPI.deleteRepo(repo.repo_id).then((res) => {
      this.props.onDeleteRepo(repo);

      // TODO: show feedback msg
    }).catch((error) => {

      // TODO: show feedback msg
    });
  }

  renderPCUI = () => {
    let repo = this.props.repo;
    let iconUrl = Utils.getLibIconUrl(repo); 
    let iconTitle = Utils.getLibIconTitle(repo);
    let repoURL = `${siteRoot}library/${repo.repo_id}/${Utils.encodePath(repo.repo_name)}/`;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onClick={this.onRepoClick}>
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
        <MediaQuery query="(max-width: 768px)">
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
              repoID={repo.repo_id}
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
      </Fragment>
    )
  }
}

MylibRepoListItem.propTypes = propTypes;

export default MylibRepoListItem;
