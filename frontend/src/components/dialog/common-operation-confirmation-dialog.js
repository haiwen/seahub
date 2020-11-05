import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmBtnText: PropTypes.string,
  executeOperation: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class CommonOperationConfirmationDialog extends Component {

  toggle = () => {
    this.props.toggleDialog();
  }

  executeOperation = () => {
    this.toggle();
    this.props.executeOperation();
  }

  render() {
    let { title, message, confirmBtnText } = this.props;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{title}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.executeOperation}>{confirmBtnText || gettext('Confirm')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CommonOperationConfirmationDialog.propTypes = propTypes;

export default CommonOperationConfirmationDialog;
