import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, FormGroup, Label, Input } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  executeOperation: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class ConfirmUnlinkDevice extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isChecked: false
    };
  }

  toggle = () => {
    this.props.toggleDialog();
  }

  executeOperation = () => {
    this.toggle();
    this.props.executeOperation(this.state.isChecked);
  }

  onInputChange = (e) => {
    this.setState({
      isChecked: e.target.checked
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Unlink device')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure you want to unlink this device?')}</p>
          <FormGroup check>
            <Label check>
              <Input type="checkbox" checked={this.state.isChecked} onChange={this.onInputChange} />
              <span>{gettext('Delete files from this device the next time it comes online.')}</span>
            </Label>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.executeOperation}>{gettext('Unlink')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ConfirmUnlinkDevice.propTypes = propTypes;

export default ConfirmUnlinkDevice;
