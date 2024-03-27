import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Alert, Button, Input, InputGroup, InputGroupAddon, FormGroup, Label, UncontrolledPopover, PopoverBody } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired
};

const passwordInputPropTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

const {
  userStrongPasswordRequired,
  userPasswordMinLength,
  userPasswordStrengthLevel
} = window.app.pageOptions;

class PasswordInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isPasswordVisible: false
    };
  }

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  };

  renderPasswordStrength = () => {
    const { value: password } = this.props;
    const strengthLevel = Utils.getStrengthLevel(password, userPasswordMinLength);
    const levelShown = strengthLevel < 3 ? strengthLevel : 3;
    const strength = [
      { text: gettext('too weak'), color: '#f00000' },
      { text: gettext('weak'), color: '#e43c44' },
      { text: gettext('medium'), color: '#ffa800' },
      { text: gettext('strong'), color: '#26b20e' }
    ];

    return (
      <div className="password-strength">
        <span className="password-strength-label">{gettext('Password Strength:')}</span>
        {password && <span style={{'color': strength[levelShown].color}} className="ml-2">{strength[levelShown].text}</span>}
        <div className="password-strength-items-container mt-1 mb-2">
          <span className="password-strength-item" style={strengthLevel > 0 ? {'background': strength[levelShown].color } : {}}></span>
          <span className="password-strength-item" style={strengthLevel > 1 ? {'background': strength[levelShown].color } : {}}></span>
          <span className="password-strength-item" style={strengthLevel > 2 ? {'background': strength[levelShown].color } : {}}></span>
        </div>
      </div>
    );
  };

  render () {
    const { label, id, value } = this.props;
    return (
      <FormGroup>
        <Label for={id}>{label}</Label>
        <InputGroup>
          <Input id={id} type={this.state.isPasswordVisible ? 'text' : 'password'} value={value || ''} onChange={this.props.onChange} />
          <InputGroupAddon addonType="append">
            <Button onClick={this.togglePasswordVisible}><i className={`user-password-operation-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
          </InputGroupAddon>
        </InputGroup>
        {(userStrongPasswordRequired && id == 'new-password') && (
          <UncontrolledPopover
            placement="left"
            trigger="focus"
            target={id}
          >
            <PopoverBody>
              {this.renderPasswordStrength()}
              <p className="user-password-tip m-0">{gettext('The password should be at least {passwordMinLength} characters and include {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols').replace('{passwordMinLength}', userPasswordMinLength).replace('{passwordStrengthLevel}', userPasswordStrengthLevel)}</p>
            </PopoverBody>
          </UncontrolledPopover>
        )}
      </FormGroup>
    );
  }
}

PasswordInput.propTypes = passwordInputPropTypes;

class UpdateUserPassword extends Component {

  constructor(props) {
    super(props);
    this.state = {
      curPassword: '',
      newPassword: '',
      newPasswordAgain: '',
      btnDisabled: false,
      errorMsg: ''
    };
  }

  submit = () => {
    const { curPassword, newPassword, newPasswordAgain } = this.state;

    if (!curPassword.trim()) {
      this.setState({
        errorMsg: gettext('Current password cannot be blank')
      });
      return false;
    }
    if (!newPassword.trim()) {
      this.setState({
        errorMsg: gettext('Password cannot be blank')
      });
      return false;
    }
    if (!newPasswordAgain.trim()) {
      this.setState({
        errorMsg: gettext('Please enter the password again')
      });
      return false;
    }
    if (newPassword.trim() != newPasswordAgain.trim()) {
      this.setState({
        errorMsg: gettext('Passwords don\'t match')
      });
      return false;
    }

    if (userStrongPasswordRequired) {
      const strengthLevel = Utils.getStrengthLevel(newPassword.trim(), userPasswordMinLength);
      if (strengthLevel < userPasswordStrengthLevel) {
        this.setState({
          errorMsg: gettext('Passwords must have at least {min_len} characters and contain {level} of the following: uppercase letters, lowercase letters, numbers, and symbols.').replace('{min_len}', userPasswordMinLength).replace('{level}', userPasswordStrengthLevel)
        });
        return false;
      }
    }

    this.setState({
      btnDisabled: true
    });
    seafileAPI.updateUserPassword(curPassword.trim(), newPassword.trim()).then((res) => {
      this.props.toggleDialog();
      toaster.success(gettext('Your password has been changed successfully.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.props.toggleDialog();
    });
  };

  handleCurPasswdInputChange = (e) => {
    this.setState({curPassword: e.target.value});
  };

  handleNewPasswdInputChange = (e) => {
    this.setState({newPassword: e.target.value});
  };

  handleNewPasswdAgainInputChange = (e) => {
    this.setState({newPasswordAgain: e.target.value});
  };

  render() {
    const { curPassword, newPassword, newPasswordAgain } = this.state;
    return (
      <Modal centered={true} isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{gettext('Password Modification')}</ModalHeader>
        <ModalBody>
          <PasswordInput id="cur-password" label={gettext('Current Password')} value={curPassword} onChange={this.handleCurPasswdInputChange} />
          <PasswordInput id="new-password" label={gettext('New Password')} value={newPassword} onChange={this.handleNewPasswdInputChange} />
          <PasswordInput id="new-password-again" label={gettext('Confirm Password')} value={newPasswordAgain} onChange={this.handleNewPasswdAgainInputChange} />
          {this.state.errorMsg && <Alert color="danger" className="m-0 mt-2">{gettext(this.state.errorMsg)}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit} disabled={this.state.btnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

UpdateUserPassword.propTypes = propTypes;

export default UpdateUserPassword;
