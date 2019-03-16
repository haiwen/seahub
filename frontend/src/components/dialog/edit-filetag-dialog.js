import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import RepoTag from '../../models/repo-tag';
require('../../css/repo-tag.css');

const TagItemPropTypes = {
  repoID: PropTypes.string.isRequired,
  repoTag: PropTypes.object.isRequired,
  filePath: PropTypes.string,
  filesPath: PropTypes.array,
  fileTagList: PropTypes.array,
  multiFileTagList: PropTypes.array,
  onEditFileTag: PropTypes.func.isRequired,
};

class TagItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showSelectedTag: false,
      freeze: false,
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
    if (this.props.fileTagList.length > 0) {
      let fileTagList = this.props.fileTagList;
      fileTagList.map((fileTag) => {
        repoTagIdList.push(fileTag.repo_tag_id);
      });
      return repoTagIdList;
    }
    else {
      const tagList = this.props.multiFileTagList;
      const length = tagList.length;
      let tagArray = [];
      for (let i = 0; i< length; i++) {
        for (let j = 0; j < tagList[i].length; j++) {
          tagArray.push(tagList[i][j].repo_tag_id);
        }
      }
      repoTagIdList = this.getCommonTag(tagArray, length);
      return repoTagIdList;
    }
  }

  getCommonTag = (arr, filesNumber) => {
    let hash = {};
    let m = 1;
    let result = [];
    for (let i = 0, len = arr.length; i < len; i++) {
      var el = arr[i];
      var uniqueEl = typeof (el) + el;
      if (!hash[uniqueEl]) {
        hash[uniqueEl] = 1;
      } else{
        hash[uniqueEl]++;
      }
      if (hash[uniqueEl] == m ) {
        if (m === filesNumber) {
          result.push(el);
        }
      } else if (hash[uniqueEl] > m) {
        m = hash[uniqueEl];
        if (m === filesNumber) {
          result.push(el);
        }
      }
    }
    return result;
  }


  onEditFileTag = () => {
    if (!this.state.freeze) {
      this.setState({ freeze: true });
    } else {
      return;
    }
    let { repoID, repoTag, filePath, filesPath, fileTagList } = this.props;
    if (filesPath.length === 1) {
      let repoTagIdList = this.getRepoTagIdList();
      if (repoTagIdList.indexOf(repoTag.id) === -1) {
        seafileAPI.addFileTag(repoID, filePath, repoTag.id).then(() => {
          repoTagIdList = this.getRepoTagIdList();
          this.props.onEditFileTag();
          this.setState({ freeze: false });
        });
      } else {
        let fileTag = null;
        for(let i = 0; i < fileTagList.length; i++) {
          if (fileTagList[i].repo_tag_id === repoTag.id) {
            fileTag = fileTagList[i];
            break;
          }
        } 
        seafileAPI.deleteFileTag(repoID, fileTag.id).then(() => {
          repoTagIdList = this.getRepoTagIdList();
          this.props.onEditFileTag();
          this.setState({ freeze: false });
        });
      }
    }
    else {
      this.onEditFilesTag();
    }
  }

  onEditFilesTag = () => {
    let { repoID, repoTag, filesPath, multiFileTagList } = this.props;
    let repoTagIdList = this.getRepoTagIdList();
    if (repoTagIdList.indexOf(repoTag.id) === -1) {
      for (let i = 0, length = filesPath.length; i < length; i++) {
        seafileAPI.addFileTag(repoID, filesPath[i], repoTag.id).then(() => {
          this.props.onEditFileTag();
          this.setState({ freeze: false });
        });
      }
    }
    else {
      for (let i = 0, len = multiFileTagList.length; i < len; i++) {
        for (let j = 0, length = multiFileTagList[i].length; j < length; j++) {
          if (multiFileTagList[i][j].repo_tag_id === repoTag.id) {
            seafileAPI.deleteFileTag(repoID, multiFileTagList[i][j].file_tag_id).then(() => {
              this.props.onEditFileTag();
              this.setState({ freeze: false });
            });
          }
        }
      }
    }
  }

  render() {
    let repoTag = this.props.repoTag;
    let repoTagIdList = this.getRepoTagIdList();
    let drakColor = Utils.getDarkColor(repoTag.color);
    return (
      <li key={repoTag.id} className="tag-list-item" onClick={this.onEditFileTag} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <div className="tag-demo" style={{backgroundColor:repoTag.color}}>
          <span className={`${this.state.showSelectedTag ? 'show-tag-selected': ''}`} style={{backgroundColor: drakColor}}></span>
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
  filePath: PropTypes.string,
  filesPath: PropTypes.array,
  fileTagList: PropTypes.array,
  multiFileTagList: PropTypes.array,
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
                    filesPath={this.props.filesPath}
                    fileTagList={this.props.fileTagList}
                    multiFileTagList={this.props.multiFileTagList}
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
