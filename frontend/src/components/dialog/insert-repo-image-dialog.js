import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import FileChooser from '../file-chooser/file-chooser';
import '../../css/insert-repo-image-dialog.css';

const { siteRoot, serviceUrl } = window.app.config;
const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class InsertRepoImageDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      selectedPath: '',
    };
  }

  insertImage = () => {
    const url = serviceUrl + '/lib/' + this.state.repo.repo_id + '/file' + Utils.encodePath(this.state.selectedPath) + '?raw=1';
    window.richMarkdownEditor.onInsertImage(url);
    this.props.toggleCancel();
  }

  onDirentItemClick = (repo, selectedPath, dirent) => {
    if (dirent.type === 'file' && Utils.imageCheck(dirent.name)) {
      this.setState({
        repo: repo,
        selectedPath: selectedPath,
      });
    }
    else {
      this.setState({repo: null, selectedPath: ''});
    }
  }

  onRepoItemClick = () => {
    this.setState({repo: null, selectedPath: ''});
  }

  render() {
    const toggle = this.props.toggleCancel;
    const fileSuffixes = ['jpg', 'png', 'jpeg', 'gif', 'bmp'];
    let imageUrl;
    if (this.state.repo) {
      imageUrl = siteRoot + 'thumbnail/' + this.state.repo.repo_id + '/1024' + this.state.selectedPath;
    }
    return (
      <Modal isOpen={true} toggle={toggle} size='lg'>
        <ModalHeader toggle={toggle}>{gettext('Select Image')}</ModalHeader>
        <ModalBody>
          <div className="d-flex">
            <div className="col-6">
              <FileChooser
                isShowFile={true}
                repoID={this.props.repoID}
                onDirentItemClick={this.onDirentItemClick}
                onRepoItemClick={this.onRepoItemClick}
                mode="current_repo_and_other_repos"
                fileSuffixes={fileSuffixes}
              />
            </div>
            <div className="insert-image-container col-6">
              {imageUrl ?
                <img src={imageUrl} className='d-inline-block mh-100 mw-100' alt=''/> :
                <span>{gettext('No preview')}</span>
              }
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          {this.state.selectedPath ?
            <Button color="primary" onClick={this.insertImage}>{gettext('Submit')}</Button>
            : <Button color="primary" disabled>{gettext('Submit')}</Button>
          }
        </ModalFooter>
      </Modal>
    );
  }
}

InsertRepoImageDialog.propTypes = propTypes;

export default InsertRepoImageDialog;
