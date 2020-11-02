import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import RepoTag from '../../models/repo-tag';
import CreateTagDialog from './create-tag-dialog';
import toaster from '../toast';
require('../../css/repo-tag.css');

const TagItemPropTypes = {
  repoID: PropTypes.string.isRequired,
  repoTag: PropTypes.object.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
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
        this.props.onFileTagChanged();
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
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
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
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

const TagListPropTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  createNewTag: PropTypes.func.isRequired,
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
      this.setState({repotagList: repotagList});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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
                  filePath={this.props.filePath}
                  fileTagList={this.props.fileTagList}
                  onFileTagChanged={this.props.onFileTagChanged}
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

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class EditFileTagDialog extends React.Component {
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
    let {repoID, filePath} = this.props;
    seafileAPI.addFileTag(repoID, filePath, repoTagID).then(() => {
      this.props.onFileTagChanged();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleCancel}>
        {this.state.isListRepoTagShow &&
          <TagList
            repoID={this.props.repoID}
            filePath={this.props.filePath}
            fileTagList={this.props.fileTagList}
            onFileTagChanged={this.props.onFileTagChanged}
            toggleCancel={this.props.toggleCancel}
            createNewTag={this.createNewTag}
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

EditFileTagDialog.propTypes = propTypes;

export default EditFileTagDialog;