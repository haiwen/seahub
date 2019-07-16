import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import RepoTag from '../../models/repo-tag';
import CreateTagDialog from './create-tag-dialog';
require('../../css/repo-tag.css');

const propTypes = {
  repoID: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  filePathList: PropTypes.array.isRequired,
  fileTags: PropTypes.array.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class EditFileTagsDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoTagShow: false,
      isListRepoTagShow: true,
    };
  }

  createNewTag = () => {
    this.setState({
      isCreateRepoTagShow: !this.state.isCreateRepoTagShow,
      isListRepoTagShow: !this.state.isListRepoTagShow,
    });
  }

  onRepoTagCreated = (repoTagID) => {
    let {repoID, filePathList, selectedDirentList} = this.props;
    filePathList.map((filePath, index) => {
      seafileAPI.addFileTag(repoID, filePath, repoTagID).then(() => {
        this.props.onFileTagChanged(selectedDirentList[index], filePath);
      });
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleCancel}>
        {this.state.isListRepoTagShow &&
          <TagList
            repoID={this.props.repoID}
            filePathList={this.props.filePathList}
            fileTags={this.props.fileTags}
            onFileTagChanged={this.props.onFileTagChanged}
            toggleCancel={this.props.toggleCancel}
            createNewTag={this.createNewTag}
            selectedDirentList={this.props.selectedDirentList}
          />
        }
        {this.state.isCreateRepoTagShow &&
          <CreateTagDialog
            repoID={this.props.repoID}
            onClose={this.props.toggleCancel}
            toggleCancel={this.createNewTag}
            onRepoTagCreated={this.onRepoTagCreated}
          />
        }
      </Modal>
    );
  }
}

EditFileTagsDialog.propTypes = propTypes;

const TagListPropTypes = {
  repoID: PropTypes.string.isRequired,
  filePathList: PropTypes.array.isRequired,
  fileTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  createNewTag: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
};

class TagList extends React.Component {
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

  render() {
    return (
      <Fragment>
        <ModalHeader toggle={this.props.toggleCancel}>{gettext('Select Tags')}</ModalHeader>
        <ModalBody>
          <ul className="tag-list tag-list-container">
            {this.state.repotagList.map((repoTag) => {
              return (
                <TagItem
                  key={repoTag.id}
                  repoTag={repoTag}
                  repoID={this.props.repoID}
                  filePathList={this.props.filePathList}
                  fileTags={this.props.fileTags}
                  onFileTagChanged={this.props.onFileTagChanged}
                  selectedDirentList={this.props.selectedDirentList}
                />
              );
            })}
          </ul>
          <a href="#" className="add-tag-link" onClick={this.props.createNewTag}>{gettext('Create a new tag')}</a>
        </ModalBody>
        <ModalFooter>
          <Button onClick={this.props.toggleCancel}>{gettext('Close')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

TagList.propTypes = TagListPropTypes;

const TagItemPropTypes = {
  repoID: PropTypes.string.isRequired,
  filePathList: PropTypes.array.isRequired,
  fileTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  repoTag: PropTypes.object.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
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
    let data = [];
    let fileTags = this.props.fileTags;
    fileTags.map(item => { 
      return data = data.concat(item);
    });
    repoTagIdList =  data.map(fileTag => { 
      return fileTag.repo_tag_id;
    }).filter((item, index, self) => {
      return self.indexOf(item) === index;
    });
    return repoTagIdList;
  }

  onEditFileTags = () => {
    let { repoID, repoTag, filePathList, selectedDirentList } = this.props;
    let repoTagIdList = this.getRepoTagIdList();
    if (repoTagIdList.indexOf(repoTag.id) === -1) {
      let id = repoTag.id;
      filePathList.map((filePath, index) => {
        seafileAPI.addFileTag(repoID, filePath, id).then(() => {
          repoTagIdList = this.getRepoTagIdList();
          this.props.onFileTagChanged(selectedDirentList[index], filePath);
        });
      });
    } else {
      let fileTags = this.props.fileTags;
      fileTags.map((fileTagItem, index) => {
        let fileTag = null;
        for(let i = 0; i < fileTagItem.length; i++) {
          if (fileTagItem[i].repo_tag_id === repoTag.id) {
            fileTag = fileTagItem[i];
            break;
          }
        }
        if (fileTag) {
          seafileAPI.deleteFileTag(repoID, fileTag.id).then(() => {
            repoTagIdList = this.getRepoTagIdList();
            this.props.onFileTagChanged(selectedDirentList[index], filePathList[index]);
          });
        }
      });
    }
  }

  render() {
    let repoTag = this.props.repoTag;
    let repoTagIdList = this.getRepoTagIdList();
    let drakColor = Utils.getDarkColor(repoTag.color);
    return (
      <li key={repoTag.id} className="tag-list-item" onClick={this.onEditFileTags} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
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

export default EditFileTagsDialog;