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
      isTagHighlighted: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      isTagHighlighted: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      isTagHighlighted: false
    });
  }

  getRepoTagIdList = () => {
    let repoTagIdList = [];
    let fileTagList = this.props.fileTagList;
    repoTagIdList = fileTagList.map((fileTag) => fileTag.repo_tag_id);
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
    const { isTagHighlighted } = this.state;
    const { repoTag } = this.props;
    const repoTagIdList = this.getRepoTagIdList();
    const isTagSelected = repoTagIdList.indexOf(repoTag.id) != -1;
    return (
      <li
        className={`tag-list-item cursor-pointer px-4 d-flex justify-content-between align-items-center ${isTagHighlighted ? 'hl' : ''}`}
        onClick={this.onEditFileTag}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <div className="d-flex align-items-center">
          <span className="tag-color w-4 h-4 rounded-circle" style={{backgroundColor: repoTag.color}}></span>
          <span className="tag-name mx-2">{repoTag.name}</span>
        </div>
        {isTagSelected && <i className="fas fa-check tag-selected-icon"></i>}
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
        <ModalBody className="px-0">
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
          <a
            href="#"
            className="add-tag-link px-4 py-2 d-flex align-items-center"
            onClick={this.props.createNewTag}
          >
            <span className="sf2-icon-plus mr-2"></span>
            {gettext('Create a new tag')}
          </a>
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
      <Modal isOpen={true} toggle={this.props.toggleCancel} autoFocus={false}>
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
