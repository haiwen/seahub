import React from 'react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

class DownloadDialog extends React.Component {

  toggle = () => {
    this.props.onCancelDownload();
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

export default DownloadDialog;
