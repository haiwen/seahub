import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  executeOperation: PropTypes.func.isRequired,
  confirmBtnText: PropTypes.string
};

class CommonOperationDialog extends Component {

  toggle = () => {
    this.props.toggle();
  }

  executeOperation = () => {
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
          <Button color="primary" onClick={this.executeOperation}>{confirmBtnText ? confirmBtnText : gettext('Confirm')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CommonOperationDialog.propTypes = propTypes;

export default CommonOperationDialog;