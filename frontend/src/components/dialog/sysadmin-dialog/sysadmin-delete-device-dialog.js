import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input } from 'reactstrap';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  toggleIsWipeDevice: PropTypes.func.isRequired,
  isWipeDevice: PropTypes.bool.isRequired,
  unlinkDevice: PropTypes.func.isRequired
};

class SysAdminDeleteDeviceDialog extends React.Component {

  toggle = () => {
    this.props.toggle();
  }
  
  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} centered={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Unlink device')}</ModalHeader>
        <ModalBody>
          <Form>
            <p>{gettext('Are you sure you want to unlink this device?')}</p>
            <FormGroup check>
              <Label check>
                <Input type="checkbox" checked={this.props.isWipeDevice} onChange={this.props.toggleIsWipeDevice}/>{gettext('Delete files from this device the next time it comes online.')}
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.unlinkDevice}>{gettext('Unlink')}</Button>{' '}
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminDeleteDeviceDialog.propTypes = propTypes;

export default SysAdminDeleteDeviceDialog;
