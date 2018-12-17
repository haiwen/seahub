import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class EditFileTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repotagList: [],
    };
  }

  componentDidMount() {
    this.getRepoTagList();
  }

  getRepoTagList = () => {
    let repoID = this.props.repoID;
    seafileAPI.listRepoTags(repoID).then(res => {
      let repotagList = [];
      res.data.repo_tags.forEach(item => {
        let repoTag = new RepoTag(item);
        repotagList.push(repoTag);
      });
      this.setState({
        repotagList: repotagList,
      });
    });
  }

  getRepoTagIdList = () => {
    let repoTagIdList = [];
    let fileTagList = this.props.fileTagList;
    fileTagList.map((fileTag) => {
      repoTagIdList.push(fileTag.repo_tag_id);
    });
    return repoTagIdList;
  }

  editFileTag = (repoTag) => {
    let repoID = this.props.repoID;
    let repoTagIdList = this.getRepoTagIdList();
    if (repoTagIdList.indexOf(repoTag.id) === -1) {
      let id = repoTag.id;
      let filePath = this.props.filePath;
      seafileAPI.addFileTag(repoID, filePath, id).then(() => {
        repoTagIdList = this.getRepoTagIdList();
        this.props.onFileTagChanged();
      });
    } else {
      let fileTag = null;
      let fileTagList = this.props.fileTagList;
      for(let i = 0; i < fileTagList.length; i++) {
        if (fileTagList[i].repo_tag_id === repoTag.id) {
          fileTag = fileTagList[i];
          break;
        }
      } 
      seafileAPI.deleteFileTag(repoID, fileTag.id).then(() => {
        repoTagIdList = this.getRepoTagIdList();
        this.props.onFileTagChanged();
      });
    }
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    let repoTagIdList = this.getRepoTagIdList();
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Select Tags')}</ModalHeader>
        <ModalBody>
          {
            <ul className="tag-list tag-list-container">
              {this.state.repotagList.map((repoTag) => {
                return (
                  <li key={repoTag.id} className="tag-list-item" onClick={this.editFileTag.bind(this, repoTag)}>
                    <div className={`tag-demo bg-${repoTag.color}`}>
                      <span>{repoTag.name}</span>
                      {repoTagIdList.indexOf(repoTag.id) > -1 &&
                        <i className="fas fa-check tag-operation"></i>
                      }
                    </div>
                  </li>
                );
              })}
            </ul>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

EditFileTagDialog.propTypes = propTypes;

export default EditFileTagDialog;
