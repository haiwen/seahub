import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addOrg: PropTypes.func.isRequired,
};

class SysAdminAddOrgDialog extends React.Component {
  constructor(props) {
    super(props);
    this.fileInputRef = React.createRef();
    this.state = {
      errorMsg: '',
      password: '',
      passwordAgain: '',
      email: '',
      name: '',
    };
  }

  toggle = () => {
    this.props.toggle();
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
    let newOrgInfo = {
      email: email,
      name: name,
      password: password,
    };
    this.props.addOrg(newOrgInfo);
  }

  render() {
    let { errorMsg, isPasswordVisible, password, passwordAgain, email, name } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add organization')}</ModalHeader>
        <ModalBody>
          <Form autoComplete="off">
            <FormGroup>
              <Label className="font-weight-bold">{gettext('Name')}</Label>
              <Input value={name} onChange={this.inputName}/> 
            </FormGroup>
            <FormGroup>
              <Label className="font-weight-bold">{gettext('Owner')}</Label>
              <Input autoComplete="new-password" value={email} onChange={this.inputEmail}/> 
            </FormGroup>
            <FormGroup className="link-operation-content">
              <Label className="font-weight-bold">{gettext('Password')}</Label>
              <Input autoComplete="new-password" type={isPasswordVisible ? 'text' : 'password'} value={password || ''} onChange={this.inputPassword}/>
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

SysAdminAddOrgDialog.propTypes = propTypes;

export default SysAdminAddOrgDialog;