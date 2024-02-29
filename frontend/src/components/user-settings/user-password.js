import React from 'react';
import ModalPortal from '../modal-portal';
import { gettext, siteRoot } from '../../utils/constants';
import UpdateUserPassword from '../dialog/update-user-password';

const {
  passwordOperationType,
  passwordOperationText
} = window.app.pageOptions;

class UserPassword extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isUpdatePasswordDialogOpen: false
    };
  }

  toggleUpdatePasswordDialog = () => {
    this.setState({
      isUpdatePasswordDialogOpen: !this.state.isUpdatePasswordDialogOpen,
    });
  };

  render() {
    return (
      <React.Fragment>
        <div id="update-user-passwd" className="setting-item">
          <h3 className="setting-item-heading">{gettext('Password')}</h3>
          {passwordOperationType == 'Set Password' && <a href={`${siteRoot}accounts/password/change/`} className="btn btn-outline-primary">{passwordOperationText}</a>}
          {passwordOperationType == 'Update' && <button className="btn btn-outline-primary" onClick={this.toggleUpdatePasswordDialog}>{passwordOperationText}</button>}
        </div>
        {this.state.isUpdatePasswordDialogOpen && (
          <ModalPortal>
            <UpdateUserPassword
              toggleDialog={this.toggleUpdatePasswordDialog}
            />
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default UserPassword;
