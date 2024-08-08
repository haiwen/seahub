import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import toaster from '../toast';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  itemPath: PropTypes.string.isRequired,
  loadDirentList: PropTypes.func.isRequired,
};

class UploadSdocDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMsg: ''
    };
    this.fileInputRef = React.createRef();
  }

  toggle = () => {
    this.props.toggle();
  };

  openFileInput = () => {
    this.fileInputRef.current.click();
  };

  uploadSdoc = (file) => {
    toaster.notify(gettext('It may take some time, please wait.'));
    let { repoID, itemPath } = this.props;
    seafileAPI.importSdoc(file, repoID, itemPath).then((res) => {
      this.props.loadDirentList(itemPath);
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  };

  uploadFile = (e) => {
    // no file selected
    if (!this.fileInputRef.current.files.length) {
      return;
    }
    // check file extension
    let fileName = this.fileInputRef.current.files[0].name;
    if (fileName.substr(fileName.lastIndexOf('.') + 1) != 'zsdoc') {
      this.setState({
        errorMsg: gettext('Please choose a .zsdoc file.')
      });
      return;
    }
    const file = this.fileInputRef.current.files[0];
    this.uploadSdoc(file);
    this.toggle();
  };

  render() {
    let { errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Import sdoc')}</ModalHeader>
        <ModalBody>
          <button className="btn btn-outline-primary" onClick={this.openFileInput}>{gettext('Import sdoc')}</button>
          <input className="d-none" type="file" onChange={this.uploadFile} ref={this.fileInputRef} />
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

UploadSdocDialog.propTypes = propTypes;

export default UploadSdocDialog;
