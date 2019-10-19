
import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string
};

class CommonWaitingDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{this.props.title}</ModalHeader>
        <ModalBody>
          <p>{this.props.message}</p>
        </ModalBody>
      </Modal>
    );
  }
}

CommonWaitingDialog.propTypes = propTypes;

export default CommonWaitingDialog;
