import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import FileChooser from '../file-chooser/file-chooser';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  sharedToken: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  handleSaveSharedFile: PropTypes.func.isRequired,
};

class SaveSharedFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      selectedPath: '',
      errMessage: '',
    };
  }

  onSaveSharedFile = () => {
    seafileAPI.saveSharedFile(this.state.repo.repo_id, this.state.selectedPath, this.props.sharedToken).then((res) => {
      this.props.toggleCancel();
      this.props.handleSaveSharedFile();
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errMessage: error.response.data.error_msg
        });
      }
    });
  }

  onDirentItemClick = (repo, selectedPath, dirent) => {
    if (dirent.type === 'dir') {
      this.setState({
        repo: repo,
        selectedPath: selectedPath,
      });
    }
    else {
      this.setState({
        repo: null,
        selectedPath: '',
      });
    }
  }

  render() {
    return (
      <Modal isOpen={true} className="sf-save-file">
        <ModalHeader toggle={this.props.toggleCancel}>{gettext('Select Folder')}</ModalHeader>
        <ModalBody>
          <FileChooser
            isShowFile={false}
            onDirentItemClick={this.onDirentItemClick}
          />
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Cancel')}</Button>
          { this.state.selectedPath ?
            <Button color="primary" onClick={this.onSaveSharedFile}>{gettext('Submit')}</Button>
            :
            <Button color="primary" disabled>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

SaveSharedFileDialog.propTypes = propTypes;

export default SaveSharedFileDialog;
