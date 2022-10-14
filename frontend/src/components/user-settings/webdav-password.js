import React from 'react';
import ModalPortal from '../modal-portal';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UpdateWebdavPassword from '../dialog/update-webdav-password';

class WebdavPassword extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
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
    const { isPasswordVisible } = this.state;
    return (
      <React.Fragment>
        <div id="update-webdav-passwd" className="setting-item">
        <h3 className="setting-item-heading">{gettext('WebDav Password')}</h3>
        <button className="btn btn-outline-primary" onClick={this.toggleDialog}>{gettext('Set Password')}</button>
        </div>
        {this.state.isDialogOpen && (
          <ModalPortal>
            <UpdateWebdavPassword
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
