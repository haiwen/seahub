import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, InputGroup } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-role-editor';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  availableRoles: PropTypes.array.isRequired,
  dialogTitle: PropTypes.string.isRequired,
  showRole: PropTypes.bool.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  addUser: PropTypes.func.isRequired
};

class SysAdminAddUserDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      isPasswordVisible: false,
      password: '',
      passwordAgain: '',
      email: '',
      name: '',
      role: 'default',
      isSubmitBtnActive: false
    };
  }

  checkSubmitBtnActive = () => {
    const { email, password, passwordAgain } = this.state;
    let btnActive = true;
    if (email.trim() &&
      password.trim() &&
      passwordAgain.trim()) {
      btnActive = true;
    } else {
      btnActive = false;
    }
    this.setState({
      isSubmitBtnActive: btnActive
    });
  };

  toggle = () => {
    this.props.toggleDialog();
  };

  togglePasswordVisible = () => {
    this.setState({ isPasswordVisible: !this.state.isPasswordVisible });
  };

  inputPassword = (e) => {
    let passwd = e.target.value;
    this.setState({
      password: passwd,
      errorMsg: ''
    }, this.checkSubmitBtnActive);
  };

  inputPasswordAgain = (e) => {
    let passwd = e.target.value;
    this.setState({
      passwordAgain: passwd,
      errorMsg: ''
    }, this.checkSubmitBtnActive);
  };

  generatePassword = () => {
    let val = Utils.generatePassword(8);
    this.setState({
      password: val,
      passwordAgain: val
    }, this.checkSubmitBtnActive);
  };

  inputEmail = (e) => {
    let email = e.target.value;
    this.setState({
      email: email
    }, this.checkSubmitBtnActive);
  };

  inputName = (e) => {
    let name = e.target.value;
    this.setState({
      name: name
    });
  };

  updateRole = (role) => {
    this.setState({
      role: role
    });
  };

  handleSubmit = () => {
    const { email, password, passwordAgain, name, role } = this.state;
    if (password != passwordAgain) {
      this.setState({ errorMsg: gettext('Passwords do not match.') });
      return;
    }
    let data = {
      email: email.trim(),
      name: name.trim(),
      password: password.trim()
    };
    if (this.props.showRole) {
      data.role = role;
    }
    this.props.addUser(data);
    this.toggle();
  };

  render() {
    const { dialogTitle, showRole } = this.props;
    const {
      errorMsg, isPasswordVisible,
      email, name, role, password, passwordAgain,
      isSubmitBtnActive
    } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{dialogTitle || gettext('Add Member')}</SeahubModalHeader>
        <ModalBody>
          <Form autoComplete="off">
            <FormGroup>
              <Label>{gettext('Email')}</Label>
              <Input value={email} onChange={this.inputEmail} />
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Name(optional)')}</Label>
              <Input type="text" value={name} onChange={this.inputName} />
            </FormGroup>
            {showRole &&
            <FormGroup>
              <Label>
                {gettext('Role')}
                <span className="small text-secondary ml-1 sf3-font sf3-font-tips" title={gettext('You can also add a user as a guest, who will not be allowed to create libraries and groups.')}></span>
              </Label>
              <SysAdminUserRoleEditor
                isTextMode={false}
                isEditIconShow={false}
                currentRole={role}
                roleOptions={this.props.availableRoles}
                onRoleChanged={this.updateRole}
              />
            </FormGroup>
            }
            <FormGroup>
              <Label>{gettext('Password')}</Label>
              <InputGroup>
                <Input autoComplete="new-password" type={isPasswordVisible ? 'text' : 'password'} value={password || ''} onChange={this.inputPassword} />
                <Button className="mt-0" onClick={this.togglePasswordVisible}>
                  <i className={`link-operation-icon sf3-font sf3-font-eye${this.state.isPasswordVisible ? '' : '-slash'}`}></i>
                </Button>
                <Button className="mt-0" onClick={this.generatePassword}>
                  <i className="link-operation-icon sf3-font sf3-font-magic"></i>
                </Button>
              </InputGroup>
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Password again')}</Label>
              <Input type={isPasswordVisible ? 'text' : 'password'} value={passwordAgain || ''} onChange={this.inputPasswordAgain} />
            </FormGroup>
          </Form>
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminAddUserDialog.propTypes = propTypes;

export default SysAdminAddUserDialog;
