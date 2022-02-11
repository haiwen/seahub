import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Alert, Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
const { webdavSecretMinLength, webdavSecretStrengthLevel } = window.app.pageOptions;

const propTypes = {
  password: PropTypes.string.isRequired,
  updatePassword: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired
};

class UpdateWebdavPassword extends Component {

  constructor(props) {
    super(props);
    this.state = {
      errorInfo: '',
      password: this.props.password,
      isPasswordVisible: false,
      btnDisabled: false
    };
  }

  submit = () => {

    if (this.state.password.length === 0) {
      this.setState({errorInfo: 'Please enter password'});
      return false;
    }
    if (this.state.password.length < webdavSecretMinLength) {
      this.setState({errorInfo: 'Password is too short'});
      return false;
    }

    if (Utils.getStrengthLevel(this.state.password) < webdavSecretStrengthLevel) {
      this.setState({errorInfo: gettext('Password is too weak, should have at least {webdavSecretStrengthLevel} of the following: num, upper letter, lower letter and other symbols'.replace('{webdavSecretStrengthLevel}', webdavSecretStrengthLevel))});
      return false;
    }

    this.setState({
      btnDisabled: true
    });

    this.props.updatePassword(this.state.password);
  }

  handleInputChange = (e) => {
    let passwd = e.target.value.trim();
    this.setState({password: passwd});
  }

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  }

  generatePassword = () => {
    let randomPassword = Utils.generatePassword(webdavSecretMinLength);
    this.setState({
      password: randomPassword,
      isPasswordVisible: true
    });
  }

  render() {
    const { toggle } = this.props;
    let passwordLengthTip = gettext('(at least {passwordLength} characters and has {shareLinkPasswordStrengthLevel} of the following: num, upper letter, lower letter and other symbols)');
    passwordLengthTip = passwordLengthTip.replace('{passwordLength}', webdavSecretMinLength)
                                         .replace('{shareLinkPasswordStrengthLevel}', webdavSecretStrengthLevel);
    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>{gettext('WebDav Password')}</ModalHeader>
        <span className="tip">{passwordLengthTip}</span>
        <ModalBody>
          <InputGroup className="">
            <Input type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password} onChange={this.handleInputChange} autoComplete="new-password"/>
            <InputGroupAddon addonType="append">
              <Button onClick={this.togglePasswordVisible}><i className={`fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
              <Button onClick={this.generatePassword}><i className="fas fa-magic"></i></Button>
            </InputGroupAddon>
          </InputGroup>
        </ModalBody>
        <ModalFooter>
          {this.state.errorInfo && <Alert color="danger" className="mt-2">{gettext(this.state.errorInfo)}</Alert>}
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit} disabled={this.state.btnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

UpdateWebdavPassword.propTypes = propTypes;

export default UpdateWebdavPassword;
