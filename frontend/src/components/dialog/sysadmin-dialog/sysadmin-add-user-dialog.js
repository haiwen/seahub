
import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-roles-editor';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addUser: PropTypes.func.isRequired,
  availableRoles: PropTypes.array,
};

class SysAdminAddUserDialog extends React.Component {
  constructor(props) {
    super(props);
    this.fileInputRef = React.createRef();
    this.state = {
      errorMsg: '',
      isPasswordVisible: false,
      password: '',
      passwordAgain: '',
      email: '',
      name: '',
      role: 'default',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  togglePasswordVisible = () => {
    this.setState({isPasswordVisible: !this.state.isPasswordVisible});
  }

  inputPassword = (e) => {
    let passwd = e.target.value.trim();
    this.setState({
      password: passwd,
      errorMsg: ''
    });
  }

  inputPasswordAgain = (e) => {
    let passwd = e.target.value.trim();
    this.setState({
      passwordAgain: passwd,
      errorMsg: ''
    });
  }

  generatePassword = () => {
    let val = Utils.generatePassword(8);
    this.setState({
      password: val,
      passwordAgain: val
    });
  }

  inputEmail = (e) => {
    let email = e.target.value.trim();
    this.setState({
      email: email,
      errorMsg: ''
    });
  }

  inputName = (e) => {
    let name = e.target.value.trim();
    this.setState({
      name: name,
      errorMsg: ''
    });
  }

  updateRole = (role) => {
    this.setState({
      role: role
    });
  }

  handleSubmit = () => {
    let {email, password, passwordAgain, name, role } = this.state;
    if (!Utils.isValidEmail(email)) {
      this.setState({errorMsg: gettext('Email invalid.')});
      return;
    }
    if (password === '') {
      this.setState({errorMsg: gettext('Password invalid.')});
      return;
    }
    if (password != passwordAgain) {
      this.setState({errorMsg: gettext('Passwords do not match.')});
      return;
    }
    let newUserInfo = {
      email: email,
      name: name,
      role: role,
      password: password,
      isActive: true
    };
    this.props.addUser(newUserInfo);
  }

  render() {
    let { errorMsg, isPasswordVisible, password, passwordAgain, email, name, role } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add user')}</ModalHeader>
        <ModalBody>
          <Form autoComplete="off">
            <FormGroup>
              <Label className="font-weight-bold">{gettext('Email')}</Label>
              <Input value={email} onChange={this.inputEmail}/> 
            </FormGroup>
            <FormGroup>
              <Label className="font-weight-bold">{gettext('Name(optional)')}</Label>
              <Input autoComplete="new-password" value={name} onChange={this.inputName}/> 
            </FormGroup>
            <FormGroup>
              <Label className="font-weight-bold">{gettext('Role')}</Label>
              <SysAdminUserRoleEditor
                isTextMode={false}
                isEditIconShow={true}
                currentRole={role}
                roleOptions={this.props.availableRoles}
                onRoleChanged={this.updateRole}
              />
            </FormGroup>
            <FormGroup className="link-operation-content">
              <Label className="font-weight-bold">{gettext('Password')}</Label>
              <InputGroup>
                <Input autoComplete="new-password" type={isPasswordVisible ? 'text' : 'password'} value={password || ''} onChange={this.inputPassword}/>
                <InputGroupAddon addonType="append">
                  <Button className="mt-0" onClick={this.togglePasswordVisible}><i className={`link-operation-icon fas ${this.state.isPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
                  <Button className="mt-0" onClick={this.generatePassword}><i className="link-operation-icon fas fa-magic"></i></Button>
                </InputGroupAddon>
              </InputGroup>
              <Label className="font-weight-bold">{gettext('Password again')}</Label>
              <Input className="passwd" type={isPasswordVisible ? 'text' : 'password'} value={passwordAgain || ''} onChange={this.inputPasswordAgain} />
            </FormGroup>
          </Form>
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminAddUserDialog.propTypes = propTypes;

export default SysAdminAddUserDialog;
