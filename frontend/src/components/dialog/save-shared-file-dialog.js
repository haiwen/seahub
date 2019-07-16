import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import FileChooser from '../file-chooser/file-chooser';
import { Utils } from '../../utils/utils';

const propTypes = {
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
      let errMessage = Utils.getErrorMsg(error);
      this.setState({errMessage: errMessage});
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

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      selectedPath: '/',
    });
  }

  render() {
    return (
      <Modal isOpen={true} className="sf-save-file">
        <ModalHeader toggle={this.props.toggleCancel}>{gettext('Save to:')}</ModalHeader>
        <ModalBody>
          <FileChooser
            isShowFile={false}
            onDirentItemClick={this.onDirentItemClick}
            onRepoItemClick={this.onRepoItemClick}
            mode="only_all_repos"
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
