import React from 'react';
import ModalPortal from '../modal-portal';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import SetWebdavPassword from '../dialog/set-webdav-password';
import ResetWebdavPassword from '../dialog/reset-webdav-password';
import RemoveWebdavPassword from '../dialog/remove-webdav-password';

const { username, webdavUrl, webdavPasswordSetted } = window.app.pageOptions;

class WebdavPassword extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isWebdavPasswordSetted: webdavPasswordSetted,
      isSetPasserdDialogOpen: false,
      isResetPasserdDialogOpen: false,
      isRemovePasserdDialogOpen: false,
    };
  }

  toggleSetPasswordDialog = () => {
    this.setState({
      isSetPasserdDialogOpen: !this.state.isSetPasserdDialogOpen,
    });
  }

  setPassword = (password) => {
    seafileAPI.updateWebdavSecret(password).then((res) => {
      this.toggleSetPasswordDialog();
      this.setState({
        isWebdavPasswordSetted: !this.state.isWebdavPasswordSetted,
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.toggleSetPasswordDialog();
      toaster.danger(errorMsg);
    });
  }

  toggleResetPasswordDialog = () => {
    this.setState({
      isResetPasswordDialogOpen: !this.state.isResetPasswordDialogOpen,
    });
  }

  resetPassword = (password) => {
    seafileAPI.updateWebdavSecret(password).then((res) => {
      this.toggleResetPasswordDialog();
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.toggleResetPasswordDialog();
      toaster.danger(errorMsg);
    });
  }

  toggleRemovePasswordDialog = () => {
    this.setState({
      isRemovePasswordDialogOpen: !this.state.isRemovePasswordDialogOpen,
    });
  }

  removePassword = () => {
    seafileAPI.updateWebdavSecret().then((res) => {
      this.toggleRemovePasswordDialog();
      this.setState({
        isWebdavPasswordSetted: !this.state.isWebdavPasswordSetted,
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.toggleRemovePasswordDialog();
      toaster.danger(errorMsg);
    });
  }

  onIconKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }

  render() {
    const { isWebdavPasswordSetted } = this.state;
    return (
      <React.Fragment>
        <div id="update-webdav-passwd" className="setting-item">
          <h3 className="setting-item-heading">{gettext('WebDAV Password')}</h3>
          <p>WebDAV URL: <a href={webdavUrl}>{webdavUrl}</a></p>
          <p>{gettext('WebDAV username:')} {username}</p>
          {!isWebdavPasswordSetted ?
            <React.Fragment>
              <p>{gettext('WebDAV password:')} {gettext('not set')}</p>
              <button className="btn btn-outline-primary" onClick={this.toggleSetPasswordDialog}>{gettext('Set Password')}</button>
            </React.Fragment>
            :
            <React.Fragment>
              <p>{gettext('WebDAV password:')} ***</p>
              <button className="btn btn-outline-primary mr-2" onClick={this.toggleResetPasswordDialog}>{gettext('Reset Password')}</button>
              <button className="btn btn-outline-primary" onClick={this.toggleRemovePasswordDialog}>{gettext('Delete Password')}</button>
            </React.Fragment>
          }
        </div>
        {this.state.isSetPasserdDialogOpen && (
          <ModalPortal>
            <SetWebdavPassword
              setPassword={this.setPassword}
              toggle={this.toggleSetPasswordDialog}
            />
          </ModalPortal>
        )}
        {this.state.isResetPasswordDialogOpen && (
          <ModalPortal>
            <ResetWebdavPassword
              resetPassword={this.resetPassword}
              toggle={this.toggleResetPasswordDialog}
            />
          </ModalPortal>
        )}
        {this.state.isRemovePasswordDialogOpen && (
          <ModalPortal>
            <RemoveWebdavPassword
              removePassword={this.removePassword}
              toggle={this.toggleRemovePasswordDialog}
            />
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default WebdavPassword;
