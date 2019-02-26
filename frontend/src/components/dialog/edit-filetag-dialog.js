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
    this.darkColorDict = {'red': '#D11507', 'orange': '#FF8C00', 'yellow': '#EDEF00', 'green': '#006400', 'cyan': '#00E0E1',
                          'blue': '#2510A3', 'indigo': '#350C56', 'purple': '#551054', 'pink': '#E3A5B0', 'azure': '#C4D0D0',
                          'lime': '#00E100', 'teal': '#006A6B', 'gray': '#545454', '#FFA8A8': '#E49090', '#FFA94D': '#E39136',
                          '#FFD43B': '#E0B815', '#A0EC50': '#83CF32', '#A9E34B': '#8DC72E', '#63E6BE': '#43CAA4',
                          '#4FD2C9': '#2DB9B0', '#72C3FC': '#57ABE3', '#91A7FF': '#7A91E7', '#E599F7': '#CC82DE',
                          '#B197FC': '#9B82E5', '#F783AC': '#DF6D97', '#CED4DA': '#A8ADB2'};
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
        <div className="tag-demo" style={{backgroundColor:repoTag.color}}>
          <span className={`${this.state.showSelectedTag ? 'show-tag-selected': ''}`} style={{backgroundColor: this.darkColorDict[repoTag.color]}}></span>
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
