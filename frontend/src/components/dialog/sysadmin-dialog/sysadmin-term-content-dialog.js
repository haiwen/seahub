import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

class TermContentDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}/>
        <ModalBody>
          <p>
            {this.props.contentText}
          </p>
        </ModalBody>
      </Modal>
    );
  }
}

const propTypes = {
  toggle: PropTypes.func.isRequired,
  contentText: PropTypes.string.isRequired,
};

TermContentDialog.propTypes = propTypes;

export default TermContentDialog;
