import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Alert, Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  setPassword: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired
};

const { webdavSecretMinLength, webdavSecretStrengthLevel } = window.app.pageOptions;

class SetWebdavPassword extends Component {

  constructor(props) {
    super(props);
    this.state = {
      password: '',
      isPasswordVisible: false,
      btnDisabled: false,
      errMsg: ''
    };
  }

  submit = () => {

    if (this.state.password.length === 0) {
      this.setState({errMsg: gettext('Please enter a password.')});
      return false;
    }
    if (this.state.password.length < webdavSecretMinLength) {
      this.setState({errMsg: gettext('The password is too short.')});
      return false;
    }

    if (Utils.getStrengthLevel(this.state.password) < webdavSecretStrengthLevel) {
      this.setState({errMsg: gettext('The password is too weak. It should include at least {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols.').replace('{passwordStrengthLevel}', webdavSecretStrengthLevel)});
      return false;
    }

    this.setState({
      btnDisabled: true
    });

    this.props.setPassword(this.state.password.trim());
  }

  handleInputChange = (e) => {
    this.setState({password: e.target.value});
  }

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  }

  generatePassword = () => {
    let randomPassword = Utils.generatePassword(webdavSecretMinLength);
    this.setState({
      password: randomPassword
    });
  }

  render() {
    const { toggle } = this.props;
    const passwordTip = gettext('(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)').replace('{passwordMinLength}', webdavSecretMinLength).replace('{passwordStrengthLevel}', webdavSecretStrengthLevel);

    return (
      <Modal centered={true} isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}>{gettext('Set WebDAV Password')}</ModalHeader>
        <ModalBody>
          <InputGroup>
            <Input type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password} onChange={this.handleInputChange} autoComplete="new-password"/>
            <InputGroupAddon addonType="append">
              <Button onClick={this.togglePasswordVisible}><i className={`fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
              <Button onClick={this.generatePassword}><i className="fas fa-magic"></i></Button>
            </InputGroupAddon>
          </InputGroup>
          <p className="form-text text-muted m-0">{passwordTip}</p>
          {this.state.errMsg && <Alert color="danger" className="m-0 mt-2">{gettext(this.state.errMsg)}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit} disabled={this.state.btnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SetWebdavPassword.propTypes = propTypes;

export default SetWebdavPassword;
