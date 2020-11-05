import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  addOrg: PropTypes.func.isRequired
};

class SysAdminAddOrgDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      email: '',
      password: '',
      passwordAgain: '',
      errorMsg: '',
      isSubmitBtnActive: false
    };
  }

  checkSubmitBtnActive = () => {
    const { name, email, password, passwordAgain } = this.state;
    let btnActive = true;
    if (name.trim() !='' &&
      email.trim() != '' &&
      password.trim() != '' &&
      passwordAgain.trim() != '') {
      btnActive = true;
    } else {
      btnActive = false;
    }
    this.setState({
      isSubmitBtnActive: btnActive
    });
  }

  toggle = () => {
    this.props.toggleDialog();
  }

  inputPassword = (e) => {
    let passwd = e.target.value;
    this.setState({
      password: passwd
    }, this.checkSubmitBtnActive);
  }

  inputPasswordAgain = (e) => {
    let passwd = e.target.value;
    this.setState({
      passwordAgain: passwd
    }, this.checkSubmitBtnActive);
  }

  inputEmail = (e) => {
    let email = e.target.value;
    this.setState({
      email: email
    }, this.checkSubmitBtnActive);
  }

  inputName = (e) => {
    let name = e.target.value;
    this.setState({
      name: name
    }, this.checkSubmitBtnActive);
  }

  handleSubmit = () => {
    let { name, email, password, passwordAgain } = this.state;
    if (password != passwordAgain) {
      this.setState({errorMsg: gettext('Passwords do not match.')});
      return;
    }
    const data = {
      orgName: name.trim(),
      ownerEmail: email.trim(),
      password: password.trim()
    };
    this.props.addOrg(data);
    this.toggle();
  }

  render() {
    const { errorMsg, password, passwordAgain, email, name, isSubmitBtnActive } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add Organization')}</ModalHeader>
        <ModalBody>
          <Form autoComplete="off">
            <FormGroup>
              <Label>{gettext('Name')}</Label>
              <Input value={name} onChange={this.inputName} />
            </FormGroup>
            <FormGroup>
              <Label>
                {gettext('Owner')}
                <span className="small text-secondary ml-1 fas fa-question-circle" title={gettext('Owner can use admin panel in an organization, must be a new account.')}></span>
              </Label>
              <Input value={email} onChange={this.inputEmail} />
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Password')}</Label>
              <Input type="password" value={password} onChange={this.inputPassword} />
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Password again')}</Label>
              <Input type="password" value={passwordAgain} onChange={this.inputPasswordAgain} />
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

SysAdminAddOrgDialog.propTypes = propTypes;

export default SysAdminAddOrgDialog;
