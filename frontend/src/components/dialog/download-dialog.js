import React from 'react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

class DownLoadDialog extends React.Component {

  toggle = () => {
    this.props.onCancleDownload();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}></ModalHeader>
        <ModalBody>
          <div>{this.props.progress}</div>
        </ModalBody>
      </Modal>
    )
  }
}

export default DownLoadDialog;
