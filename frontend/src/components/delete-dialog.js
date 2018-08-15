import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

class Delete extends React.Component {

  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.props.toggleCancel();
  }
  
  render() {
    return (
      <Modal isOpen={this.props.isOpen} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>Delete</ModalHeader>
        <ModalBody>
          <p>Are you sure to delete?</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="danger" onClick={this.props.handleSubmit}>{"YES"}</Button>{' '}
          <Button outline color="secondary" onClick={this.toggle}>{"NO"}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default Delete;
