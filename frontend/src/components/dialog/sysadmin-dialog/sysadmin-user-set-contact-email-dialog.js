
import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onContactEmailChanged: PropTypes.func.isRequired
};

class SysAdminUserSetContactEmailDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      contactEmail: '',
      isSubmitBtnActive: false,
      errorMsg: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleContactEmailChange = (e) => {
    this.setState({contactEmail: e.target.value.trim()});
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  handleSubmit = () => {
    let { contactEmail } = this.state;
    if(Utils.isValidEmail(contactEmail) || contactEmail === '') {
      this.props.onContactEmailChanged(contactEmail);
    } else {
      this.setState({
        errorMsg: gettext('Contact email invalid.')
      });
    }
  }

  render() {
    let { contactEmail, errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set user contact email')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                value={contactEmail}
                onChange={this.handleContactEmailChange}
              />
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

SysAdminUserSetContactEmailDialog.propTypes = propTypes;

export default SysAdminUserSetContactEmailDialog;
