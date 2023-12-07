import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalHeader, ModalBody, ModalFooter, Label, Form, InputGroup, InputGroupAddon, FormGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class OrgAdminInviteUserDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      email: '',
      errMessage: '',
      isAddingUser: false,
    };
  }

  handleSubmit = () => {
    let isValid = this.validateInputParams();
    if (isValid) {
      let { email } = this.state;
      this.setState({isAddingUser: true});
      this.props.handleSubmit(email.trim());
    }
  }

  handleKeyPress = (e) => {
    e.preventDefault();
    if (e.key == 'Enter') {
      this.handleSubmit(e);
    }
  };

  inputEmail = (e) => {
    let email = e.target.value.trim();
    this.setState({email: email});
  }

  toggle = () => {
    this.props.toggle();
  }

  validateInputParams() {
    let errMessage;
    let email = this.state.email.trim();
    if (!email.length) {
      errMessage = gettext('email is required');
      this.setState({errMessage: errMessage});
      return false;
    }
    return true;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Invite users')}</ModalHeader>
        <ModalBody>
          <p>{gettext('You can enter multiple emails, separated by commas. An invitation link will be sent to each user.')}</p>
          <Form>
            <FormGroup>
              <Label for="emails">{gettext('Emails')}</Label>
              <Input
                type="text"
                id="emails"
                placeholder={gettext('Emails, separated by \',\'')}
                value={this.state.email || ''}
                onChange={this.inputEmail}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Label className="err-message">{this.state.errMessage}</Label>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" disabled={this.state.isAddingUser} onClick={this.handleSubmit} className={this.state.isAddingUser ? 'btn-loading' : ''}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

OrgAdminInviteUserDialog.propTypes = propTypes;

export default OrgAdminInviteUserDialog;
