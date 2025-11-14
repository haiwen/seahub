import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Icon from '../icon';

class TagItem extends React.Component {

  onMouseEnter = () => {
    this.props.setHighlightIndex(this.props.index);
  };

  onMouseLeave = () => {
    this.props.setHighlightIndex(-1);
  };

  getRepoTagIdList = () => {
    let repoTagIdList = [];
    let fileTagList = this.props.fileTagList || [];
    repoTagIdList = fileTagList.map((fileTag) => fileTag.repo_tag_id);
    return repoTagIdList;
  };

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
      for (let i = 0; i < fileTagList.length; i++) {
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
  };

  render() {
    const { repoTag, highlightIndex, index } = this.props;
    const repoTagIdList = this.getRepoTagIdList();
    const isTagSelected = repoTagIdList.indexOf(repoTag.id) != -1;
    return (
      <li
        className={`tag-list-item cursor-pointer px-3 d-flex justify-content-between align-items-center ${highlightIndex === index ? 'hl' : ''}`}
        onClick={this.onEditFileTag}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <div className="tag-item d-flex align-items-center" style={{ backgroundColor: repoTag.color }}>
          <span className="tag-name">{repoTag.name}</span>
        </div>
        {isTagSelected && <Icon symbol="tick1" className="tag-selected-icon" />}
      </li>
    );
  }

}

TagItem.propTypes = {
  index: PropTypes.number.isRequired,
  highlightIndex: PropTypes.number.isRequired,
  repoID: PropTypes.string.isRequired,
  repoTag: PropTypes.object.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  setHighlightIndex: PropTypes.func.isRequired,
};

export default TagItem;
