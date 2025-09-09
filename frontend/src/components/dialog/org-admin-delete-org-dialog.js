import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Label, Form, FormGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  organizationName: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class OrgAdminDeleteOrgDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      errMessage: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  };

  inputName = (e) => {
    let name = e.target.value;
    this.setState({ name: name });
  };

  validateInputParams() {
    let errMessage;
    let name = this.state.name.trim();
    if (!name.length) {
      errMessage = gettext('Name is required');
      this.setState({ errMessage: errMessage });
      return false;
    }

    if (name !== this.props.organizationName) {
      errMessage = gettext('Names don\'t match');
      this.setState({ errMessage: errMessage });
      return false;
    }
    return true;
  }

  handleSubmit = () => {
    let isValid = this.validateInputParams();
    if (isValid) {
      this.props.handleSubmit();
    }
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Delete Team')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="orgName">{gettext('To confirm, type "{placeholder}" in the box below').replace('{placeholder}', this.props.organizationName)}</Label>
              <Input id="orgName" value={this.state.name || ''} onChange={this.inputName} />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Label className="err-message">{this.state.errMessage}</Label>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit} >{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

OrgAdminDeleteOrgDialog.propTypes = propTypes;

export default OrgAdminDeleteOrgDialog;
