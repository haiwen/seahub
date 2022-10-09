import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext, repoPasswordMinLength } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class ChangeRepoPasswordDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      oldPassword: '',
      newPassword: '',
      newPasswordAgain: '',
      submitBtnDisabled: false,
      errorMsg: ''
    };
  }

  handleOldPasswordInputChange = (e) => {
    this.setState({
      oldPassword: e.target.value
    });
  }

  handleNewPasswordInputChange = (e) => {
    this.setState({
      newPassword: e.target.value
    });
  }

  handleNewPasswordAgainInputChange = (e) => {
    this.setState({
      newPasswordAgain: e.target.value
    });
  }

  formSubmit = (e) => {
    const { oldPassword, newPassword, newPasswordAgain } = this.state;
    if (!oldPassword) {
      this.setState({
        errorMsg: gettext('Please enter the old password')
      });
      return false;
    }
    if (!newPassword) {
      this.setState({
        errorMsg: gettext('Please enter a new password')
      });
      return false;
    }
    if (newPassword.length < repoPasswordMinLength) {
      this.setState({
        errorMsg: gettext('New password is too short')
      });
      return false;
    }
    if (!newPasswordAgain) {
      this.setState({
        errorMsg: gettext('Please enter the new password again')
      });
      return false;
    }
    if (newPassword != newPasswordAgain) {
      this.setState({
        errorMsg: gettext('New passwords don\'t match')
      });
      return false;
    }

    this.setState({
      submitBtnDisabled: true
    });
    seafileAPI.changeEncryptedRepoPassword(this.props.repoID, oldPassword, newPassword)
      .then(() => {
        this.props.toggleDialog();
        toaster.success(gettext('Successfully changed library password.'));
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        this.setState({
          errorMsg: errorMsg,
          submitBtnDisabled: false
        });
      });
  }


  render() {
    const { repoName, toggleDialog } = this.props;

    return (
      <Modal isOpen={true} centered={true} style={{height: 'auto'}}>
        <ModalHeader toggle={toggleDialog}>
          <span>
            {Utils.generateDialogTitle(gettext('Change Password of Library {placeholder}'), repoName)}
          </span>
        </ModalHeader>
        <ModalBody>
          <form id="repo-change-passwd-form" action="" method="post">
            <label htmlFor="passwd">{gettext('Old Password')}</label><br />
            <input type="password" name="old_passwd" className="form-control" id="passwd" value={this.state.oldPassword} onChange={this.handleOldPasswordInputChange} /><br />
            <label htmlFor="new-passwd">{gettext('New Password')}</label><span className="tip">{gettext('(at least {placeholder} characters)').replace('{placeholder}', repoPasswordMinLength)}</span><br />
            <input type="password" name="new_passwd" className="form-control" id="new-passwd" value={this.state.newPassword} onChange={this.handleNewPasswordInputChange} /><br />
            <label htmlFor="new-passwd-again">{gettext('New Password Again')}</label><br />
            <input type="password" name="new_passwd_again" className="form-control" id="new-passwd-again" value={this.state.newPasswordAgain} onChange={this.handleNewPasswordAgainInputChange} /><br />
            {this.state.errorMsg && <Alert color="danger">{this.state.errorMsg}</Alert>}
          </form>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn-primary" disabled={this.state.submitBtnDisabled} onClick={this.formSubmit}>{gettext('Submit')}</button>
        </ModalFooter>
      </Modal>
    );
  }
}

ChangeRepoPasswordDialog.propTypes = propTypes;

export default ChangeRepoPasswordDialog;
