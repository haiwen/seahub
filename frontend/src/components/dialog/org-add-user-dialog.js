import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalHeader, ModalBody, ModalFooter, Label, Form, InputGroup, InputGroupAddon, FormGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class AddOrgUserDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isPasswordVisible: true,
      email: '',
      name: '',
      password: '',
      passwdnew: '',
      errMessage: ''
    };
  }

  handleSubmit = () => {
    let isValid = this.validateInputParams();
    if (isValid) {
      let { email, name, password } = this.state;
      this.props.handleSubmit(email, name, password);
    }
  } 

  handleKeyPress = (e) => {
    e.preventDefault();
    if (e.key == 'Enter') {
      this.handleSubmit(e);
    }
  };

  togglePasswordVisible = () => {
    this.setState({
      isPasswordVisible: !this.state.isPasswordVisible
    });
  }

  generatePassword = () => {
    let val = Math.random().toString(36).substr(5);
    this.setState({
      password: val,
      passwdnew: val
    });
  }

  inputEmail = (e) => {
    let email = e.target.value.trim();
    this.setState({email: email});
  }

  inputName = (e) => {
    let name = e.target.value.trim();
    this.setState({name: name});
  }


  inputPassword = (e) => {
    let passwd = e.target.value.trim();
    this.setState({password: passwd});
  }

  inputPasswordNew = (e) => {
    let passwd = e.target.value.trim();
    this.setState({passwdnew: passwd});
  }

  toggle = () => {
    this.props.toggle();
  };

  validateInputParams() {
    let errMessage = '';
    let email = this.state.email;
    if (!email.length) {
      errMessage = 'email is required';
      this.setState({errMessage: errMessage});
      return false;
    }

    let password1 = this.state.password;
    let password2 = this.state.passwdnew;
    if (!password1.length) {
      errMessage = 'Please enter password';
      this.setState({errMessage: errMessage});
      return false;
    }
    if (!password2.length) {
      errMessage = 'Please enter the password again';
      this.setState({errMessage: errMessage});
      return false;
    }
    if (password1 !== password2) {
      errMessage = 'Passwords don\'t match';
      this.setState({errMessage: errMessage});
      return false;
    }
    return true;
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Add User')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label>{gettext('Email')}</Label>
              <Input value={this.state.email || ''} onChange={this.inputEmail} />
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Name(optional)')}</Label>
              <Input value={this.state.name || ''} onChange={this.inputName} />
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Password')}</Label>
              <InputGroup className="passwd">
                <Input type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.password || ''} onChange={this.inputPassword}/>
                <InputGroupAddon addonType="append">
                  <Button onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Confirm Password')}</Label>
              <Input className="passwd" type={this.state.isPasswordVisible ? 'text' : 'password'} value={this.state.passwdnew || ''} onChange={this.inputPasswordNew} />
            </FormGroup>
          </Form>
          <Label className="err-message">{gettext(this.state.errMessage)}</Label>
          <ModalFooter>
            <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          </ModalFooter>
        </ModalBody>
      </Modal>
    );
  }
}

AddOrgUserDialog.propTypes = propTypes;

export default AddOrgUserDialog;
