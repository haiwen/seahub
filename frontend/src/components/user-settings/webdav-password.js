import React from 'react';
import ModalPortal from '../modal-portal';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UpdateWebdavPassword from '../dialog/update-webdav-password';

const { webdavPasswd, webdavSecretMinLength, webdavSecretStrengthLevel} = window.app.pageOptions;

class WebdavPassword extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      password: webdavPasswd,
      isPasswordVisible: false,
      isDialogOpen: false
    };
  }

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  }

  updatePassword = (password) => {
    seafileAPI.updateWebdavSecret(password).then((res) => {
      this.toggleDialog();
      this.setState({
        password: password
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.toggleDialog();
      toaster.danger(errorMsg);
    });
  }

  toggleDialog = () => {
    this.setState({
      isDialogOpen: !this.state.isDialogOpen
    });
  }

  onIconKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      e.target.click();
    }
  }

  render() {
    const { password, isPasswordVisible } = this.state;
    return (
      <React.Fragment>
        <div id="update-webdav-passwd" className="setting-item">
          <h3 className="setting-item-heading">{gettext('WebDav Password')}</h3>
          {password ? (
            <React.Fragment>
              <div className="d-flex align-items-center">
                <label className="m-0 mr-2" htmlFor="passwd">{gettext('Password:')}</label>
                <input id="passwd" className="border-0 mr-1" type="text" value={isPasswordVisible ? password : '**********'} readOnly={true} size={Math.max(password.length, 10)} />
                <span tabIndex="0" role="button" aria-label={isPasswordVisible? gettext('Hide') : gettext('Show')} onClick={this.togglePasswordVisible} onKeyDown={this.onIconKeyDown} className={`eye-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
              </div>
              <button className="btn btn-outline-primary mt-2" onClick={this.toggleDialog}>{gettext('Update')}</button>
            </React.Fragment>
          ) : (
            <button className="btn btn-outline-primary" onClick={this.toggleDialog}>{gettext('Set Password')}</button>
          )}
        </div>
        {this.state.isDialogOpen && (
          <ModalPortal>
            <UpdateWebdavPassword
              password={this.state.password}
              updatePassword={this.updatePassword}
              toggle={this.toggleDialog}
            />
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default WebdavPassword;
