import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

const propTypes = {
  currentResumableFile: PropTypes.object.isRequired,
  replaceRepetitionFile: PropTypes.func.isRequired,
  uploadFile: PropTypes.func.isRequired,
  cancelFileUpload: PropTypes.func.isRequired,
};

class UploadRemindDialog extends React.Component {

  toggle = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.cancelFileUpload();
  }

  replaceRepetitionFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.replaceRepetitionFile();
  }

  uploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.uploadFile();
  }

  render() {
    const { fileName } = this.props.currentResumableFile;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          <span>{gettext('Replace file {filename}?').replace('{filename}', fileName)}</span>
        </ModalHeader>
        <ModalBody>
          <p>{gettext('A file with the same name already exists in this folder.')}</p>
          <p>{gettext('Replacing it will overwrite its content.')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.replaceRepetitionFile}>{gettext('Replace')}</Button>
          <Button color="primary" onClick={this.uploadFile}>{gettext('Don\'t replace')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

UploadRemindDialog.propTypes = propTypes;

export default UploadRemindDialog;
