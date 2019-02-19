import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import FileChooser from '../file-chooser/file-chooser';
import '../../css/dirent-detail.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onRelatedFileChange: PropTypes.func.isRequired,
  dirent: PropTypes.object.isRequired,
};

class AddRelatedFileDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      selectedPath: '',
      isShowFile: true,
      errMessage: '',
    };
  }

  handleSubmit = () => {
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

    seafileAPI.addRelatedFile(oRepoID, rRepoID, oFilePath, rFilePath).then((res) => {
      this.props.onRelatedFileChange();
      this.toggle();
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errMessage: error.response.data.error_msg
        });
      }
    });
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  onDirentItemClick = (repo, selectedPath, dirent) => {
    if (dirent.type === 'file') {
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
      repo: null,
      selectedPath: '',
    });
  }

  render() {
    let subtitle = gettext('Select related file for {placeholder}');
    subtitle = subtitle.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.dirent.name) + '</span>');
    return (
      <Modal isOpen={true} className="sf-add-related-file" toggle={this.toggle} >
        <ModalHeader toggle={this.toggle}>{gettext('Select File')}</ModalHeader>
        <ModalBody>
          <div className="related-file-subtitle" dangerouslySetInnerHTML={{__html: subtitle}}></div>
          <FileChooser
            isShowFile={this.state.isShowFile}
            repoID={this.props.repoID}
            onDirentItemClick={this.onDirentItemClick}
            onRepoItemClick={this.onRepoItemClick}
            mode="current_repo_and_other_repos"
          />
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          { this.state.selectedPath ?
            <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
            :
            <Button color="primary" disabled>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

AddRelatedFileDialog.propTypes = propTypes;

export default AddRelatedFileDialog;
