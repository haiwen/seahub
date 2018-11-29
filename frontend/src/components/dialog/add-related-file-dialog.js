import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import FileChooser from '../file-chooser/file-chooser';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class AddRelatedFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      selectedPath: '',
      errMessage: '',
      isShowFile: true,
    };
  }

  handleSumbmit = () => {
    this.onAddRelatedFile();
  }

  onAddRelatedFile = () => {
    let { repo, selectedPath } = this.state;
    let oRepoID = this.props.repoID;
    let rRepoID = repo.repo_id;
    let oFilePath = this.props.filePath;
    let rFilePath = selectedPath;

    if (oRepoID === rRepoID && oFilePath === rFilePath) {
      let message = gettext('Can not select self as a related file.');
      this.setState({errMessage: message});
      return;
    }

    seafileAPI.addRelatedFile(oRepoID, rRepoID, oFilePath, rFilePath);
    this.toggle();
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      repo: repo,
      selectedPath: selectedPath,
      errMessage: '',
    });
  }

  onRepoItemClick = () => {
    this.setState({
      errMessage: 'Can not select library as a related file.'
    });
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Select File')}</ModalHeader>
        <ModalBody>
          <FileChooser
            isShowFile={this.state.isShowFile}
            repoID={this.props.repoID}
            onDirentItemClick={this.onDirentItemClick}
            onRepoItemClick={this.onRepoItemClick}
          />
          {this.state.errMessage && <Alert color="danger" style={{margin: '0.5rem'}}>{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSumbmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddRelatedFileDialog.propTypes = propTypes;

export default AddRelatedFileDialog;
