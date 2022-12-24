
import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext, siteRoot } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  importUserInBatch: PropTypes.func.isRequired,
};

class SysAdminImportUserDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMsg: ''
    };
    this.fileInputRef = React.createRef();
  }

  toggle = () => {
    this.props.toggle();
  }

  openFileInput = () => {
    this.fileInputRef.current.click();
  }

  uploadFile = (e) => {
    // no file selected
    if (!this.fileInputRef.current.files.length) {
      return;
    }
    // check file extension
    let fileName = this.fileInputRef.current.files[0].name;
    if(fileName.substr(fileName.lastIndexOf('.') + 1) != 'xlsx') {
      this.setState({
        errorMsg: gettext('Please choose a .xlsx file.')
      });
      return;
    }
    const file = this.fileInputRef.current.files[0];
    this.props.importUserInBatch(file);
    this.toggle();
  }

  render() {
    let { errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Import users from a .xlsx file')}</ModalHeader>
        <ModalBody>
          <p><a className="text-secondary small" href={`${siteRoot}useradmin/batchadduser/example/`}>{gettext('Download an example file')}</a></p>
          <button className="btn btn-outline-primary" onClick={this.openFileInput}>{gettext('Upload file')}</button>
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

SysAdminImportUserDialog.propTypes = propTypes;

export default SysAdminImportUserDialog;
