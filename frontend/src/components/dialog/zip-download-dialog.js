import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

const propTypes = {
  onCancelDownload: PropTypes.func.isRequired,
  progress: PropTypes.number.isRequired,
};

class ZipDownloadDialog extends React.Component {

  toggle = () => {
    this.props.onCancelDownload();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}></ModalHeader>
        <ModalBody>
          <div>{this.props.progress + '%'}</div>
        </ModalBody>
      </Modal>
    );
  }
}

ZipDownloadDialog.propTypes = propTypes;

export default ZipDownloadDialog;
