import React from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const gettext = window.gettext;

class Delete extends React.Component {

  toggle = () => {
    this.props.toggleCancel();
  }
  
  render() {
    let name = this.props.currentNode.name;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext("Delete")}</ModalHeader>
        <ModalBody>
          <p>{gettext("Are you sure to delete")}{' '}<b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="danger" onClick={this.props.handleSubmit}>{gettext("YES")}</Button>
          <Button outline color="secondary" onClick={this.toggle}>{gettext("NO")}</Button>
        </ModalFooter>
      </Modal>
    )
  }
}

export default Delete;
