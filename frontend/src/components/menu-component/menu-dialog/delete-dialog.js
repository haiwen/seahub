import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

class Delete extends React.Component {

  toggle = () => {
    this.props.toggleCancel();
  }
  
  render() {
    let name = this.props.currentNode.name;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>Delete</ModalHeader>
        <ModalBody>
          <p>Are you sure to delete <b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="danger" onClick={this.props.handleSubmit}>{"YES"}</Button>
          <Button outline color="secondary" onClick={this.toggle}>{"NO"}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default Delete;
