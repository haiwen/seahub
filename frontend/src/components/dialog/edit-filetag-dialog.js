import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { repoID, gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';

const propTypes = {
  toggleCancel: PropTypes.func.isRequired,
  filetagList: PropTypes.array.isRequired,
  filePath: PropTypes.string.isRequired,
};

class EditFileTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repotagList: [],
    };
  }

  getRepoTagList = () => {
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
    let filetagList = this.props.filetagList;
    filetagList.map((fileTag) => {
      repoTagIdList.push(fileTag.repo_tag_id);
    });
    return repoTagIdList;
  }

  editFileTag = (repoTag) => {
    let repoTagIdList = this.getRepoTagIdList();
    if (repoTagIdList.indexOf(repoTag.id) === -1) {
      let id = repoTag.id;
      let filePath = this.props.filePath;
      seafileAPI.addFileTag(repoID, filePath, id).then(() => {
        repoTagIdList = this.getRepoTagIdList();
      });
    } else {
      let file_tag_id = '';
      let filetagList = this.props.filetagList;
      filetagList.map((fileTag) => {
        if (fileTag.repo_tag_id===repoTag.id) {
          file_tag_id = fileTag.id;
        }
      });
      seafileAPI.deleteFileTag(repoID, file_tag_id).then(() => {
        repoTagIdList = this.getRepoTagIdList();
      });
    }
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  componentDidMount() {
    this.getRepoTagList();
  }

  render() {
    let repoTagIdList = this.getRepoTagIdList();
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('File Tags')}</ModalHeader>
        <ModalBody>
          {<ul className="tag-list tag-list-container">
            {this.state.repotagList.map((repoTag, index) => {
              return (
                <li key={index} className="tag-list-item">
                  <span className="tag-demo" style={{background:repoTag.color}}>
                    {repoTag.name}
                    {
                      repoTagIdList.indexOf(repoTag.id)===-1 ?
                      <input type="checkbox" onClick={this.editFileTag.bind(this, repoTag)} /> :
                      <input type="checkbox" defaultChecked onClick={this.editFileTag.bind(this, repoTag)} />
                    }
                  </span>
                  <i className="tag-edit fa fa-pencil" ></i>
                </li>
              );
            })}
          </ul>}
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
