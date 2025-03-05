import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import CommonAddTool from '../common-add-tool';
import SearchInput from '../search-input';
import CustomizePopover from '../customize-popover';
import TagItem from './tag-item';
import { KeyCodes, TAG_COLORS } from '../../constants';

import '../../css/repo-tag.css';
import '../../css/edit-filetag-popover.css';

class EditFileTagPopover extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      searchVal: '',
      highlightIndex: -1,
    };
  }

  setHighlightIndex = (highlightIndex) => {
    this.setState({ highlightIndex });
  };

  generateRandomColor = () => {
    return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
  };

  createNewTag = () => {
    let name = this.state.searchVal.trim();
    if (!name) return;
    let color = this.generateRandomColor();
    let repoID = this.props.repoID;
    seafileAPI.createRepoTag(repoID, name, color).then((res) => {
      const { repo_tag: newTag } = res.data;
      this.onRepoTagCreated(newTag);
      this.setState({
        searchVal: '',
        highlightIndex: -1,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onRepoTagCreated = (newTag) => {
    const { repoID, filePath } = this.props;
    const { repo_tag_id: repoTagID } = newTag;
    seafileAPI.addFileTag(repoID, filePath, repoTagID).then(() => {
      this.props.onFileTagChanged();
      if (this.props.onNewRepoTagAdded) {
        this.props.onNewRepoTagAdded(newTag);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getRepoTagIdList = () => {
    return (this.props.fileTagList || []).map((fileTag) => fileTag.repo_tag_id);
  };

  onEditFileTag = (repoTag) => {
    let { repoID, filePath } = this.props;
    let repoTagIdList = this.getRepoTagIdList();
    if (repoTagIdList.indexOf(repoTag.id) === -1) {
      seafileAPI.addFileTag(repoID, filePath, repoTag.id).then(() => {
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

  onKeyDown = (e) => {
    const { repoTags } = this.props;
    if (e.keyCode === KeyCodes.ChineseInputMethod || e.keyCode === KeyCodes.LeftArrow || e.keyCode === KeyCodes.RightArrow) {
      e.stopPropagation();
    }
    else if (e.keyCode === KeyCodes.Enter) {
      const searchText = this.state.searchVal.trim();
      const repoTagList = repoTags.filter(item => item.name.includes(searchText));
      const tag = repoTagList[this.state.highlightIndex];
      if (tag) {
        this.onEditFileTag(tag);
      }
    }
    else if (e.keyCode === KeyCodes.UpArrow) {
      if (this.state.highlightIndex > -1) {
        this.setHighlightIndex(this.state.highlightIndex - 1);
      }
    }
    else if (e.keyCode === KeyCodes.DownArrow) {
      const searchText = this.state.searchVal.trim();
      const repoTagList = repoTags.filter(item => item.name.includes(searchText));
      if (this.state.highlightIndex < repoTagList.length) {
        this.setHighlightIndex(this.state.highlightIndex + 1);
      }
    }
  };

  onChangeSearch = (searchVal) => {
    this.setState({ searchVal });
    this.setHighlightIndex(-1);
  };

  render() {
    const searchText = this.state.searchVal.trim();
    const { repoTags: repoTagList } = this.props;
    const filteredRepoTagList = repoTagList.filter(item => item.name.includes(searchText));
    const showAddTool = searchText && !repoTagList.find(item => item.name === searchText);

    let noTagsTip = '';
    if (!searchText) {
      if (repoTagList.length == 0) {
        noTagsTip = gettext('No tags');
      }
    } else {
      if (filteredRepoTagList.length == 0) {
        noTagsTip = gettext('Tag not found');
      }
    }

    return (
      <CustomizePopover
        popoverClassName="edit-filetag-popover"
        target={this.props.target}
        hidePopover={this.props.toggleCancel}
        hidePopoverWithEsc={this.props.toggleCancel}
      >
        <SearchInput
          className="edit-filetag-popover-input"
          placeholder={gettext('Find a tag')}
          onKeyDown={this.onKeyDown}
          onChange={this.onChangeSearch}
          autoFocus={true}
        />
        {noTagsTip ?
          <div className='tag-not-found my-4 mx-1'>{noTagsTip}</div> :
          <ul className="tag-list-container">
            {filteredRepoTagList.map((repoTag, index) => {
              return (
                <TagItem
                  index={index}
                  highlightIndex={this.state.highlightIndex}
                  setHighlightIndex={this.setHighlightIndex}
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
        }
        {showAddTool &&
          <CommonAddTool
            callBack={this.createNewTag}
            footerName={`${gettext('Create a new tag')} '${searchText}'`}
          />
        }
      </CustomizePopover>
    );
  }
}

EditFileTagPopover.propTypes = {
  target: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  repoTags: PropTypes.array.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onNewRepoTagAdded: PropTypes.func
};

export default EditFileTagPopover;
