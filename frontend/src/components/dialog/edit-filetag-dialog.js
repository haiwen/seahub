import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';
require('../../css/repo-tag.css');

const TagItemPropTypes = {
  repoID: PropTypes.string.isRequired,
  repoTag: PropTypes.object.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onEditFileTag: PropTypes.func.isRequired,
};

class TagItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showSelectedTag: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      showSelectedTag: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      showSelectedTag: false
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

  onEditFileTag = () => {
    let { repoID, repoTag, filePath } = this.props;
    let repoTagIdList = this.getRepoTagIdList();
    if (repoTagIdList.indexOf(repoTag.id) === -1) {
      let id = repoTag.id;
      seafileAPI.addFileTag(repoID, filePath, id).then(() => {
        repoTagIdList = this.getRepoTagIdList();
        this.props.onEditFileTag();
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
        this.props.onEditFileTag();
      });
    }
  }

  render() {
    let repoTag = this.props.repoTag;
    let repoTagIdList = this.getRepoTagIdList();
    return (
      <li key={repoTag.id} className="tag-list-item" onClick={this.onEditFileTag} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <div className={`tag-demo bg-${repoTag.color}`}>
          <span className={`bg-${repoTag.color}-dark ${this.state.showSelectedTag ? 'show-tag-selected': ''}`}></span>
          <span className="tag-name">{repoTag.name}</span>
          {repoTagIdList.indexOf(repoTag.id) > -1 &&
            <i className="fas fa-check tag-operation"></i>
          }
        </div>
      </li>
    );
  }

}

TagItem.propTypes = TagItemPropTypes;

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

  toggle = () => {
    this.props.toggleCancel();
  }

  onEditFileTag = () => {
    this.props.onFileTagChanged();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Select Tags')}</ModalHeader>
        <ModalBody>
          {
            <ul className="tag-list tag-list-container">
              {this.state.repotagList.map((repoTag) => {
                return (
                  <TagItem 
                    key={repoTag.id} 
                    repoTag={repoTag}
                    repoID={this.props.repoID}
                    filePath={this.props.filePath}
                    fileTagList={this.props.fileTagList}
                    onEditFileTag={this.onEditFileTag}
                  />
                );
              })}
            </ul>
          }
        </ModalBody>
        <ModalFooter>
          <Button onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

EditFileTagDialog.propTypes = propTypes;

export default EditFileTagDialog;
