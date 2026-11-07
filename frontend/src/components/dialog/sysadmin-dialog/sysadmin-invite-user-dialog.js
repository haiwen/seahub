import React from 'react';
import { Alert, Modal, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '@/utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired
};

class SysAdminInviteUserDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      email: '',
      errMessage: '',
      isSubmitting: false
    };
  }

  toggle = () => {
    this.props.toggle();
  };

  inputEmail = (e) => {
    this.setState({
      email: e.target.value,
      errMessage: ''
    });
  };

  handleSubmit = () => {
    const email = this.state.email.trim();
    if (!email) {
      this.setState({ errMessage: gettext('email is required') });
      return;
    }

    this.setState({ isSubmitting: true });
    this.props.handleSubmit(email);
  };

  render() {
    const { email, errMessage, isSubmitting } = this.state;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Invite users')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('You can enter multiple emails. An invitation link will be sent to each of them.')}</p>
          <Form>
            <FormGroup>
              <Label for="invite-emails">{gettext('Emails')}</Label>
              <Input
                id="invite-emails"
                value={email}
                onChange={this.inputEmail}
                placeholder={gettext('Emails, separated by \',\'')}
              />
            </FormGroup>
          </Form>
          {errMessage && <Alert color="danger">{errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={isSubmitting}>
            {gettext('Submit')}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminInviteUserDialog.propTypes = propTypes;

export default SysAdminInviteUserDialog;
