import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  deleteFile: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class DeleteFileDialog extends Component {

  constructor(props) {
    super(props);
  }

  deleteFile = () => {
    this.props.deleteFile();
    this.props.toggleDialog();
  }

  render() {
    const { path, toggleDialog } = this.props;
    const fileName = Utils.getFileName(path);
    const opTarget = '<span class="op-target">' + Utils.HTMLescape(fileName) + '</span>';
    const message = gettext('Are you sure you want to delete %s ?').replace('%s', opTarget);

    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <ModalHeader toggle={toggleDialog}>{gettext('Delete File')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.deleteFile}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteFileDialog.propTypes = propTypes;

export default DeleteFileDialog;
