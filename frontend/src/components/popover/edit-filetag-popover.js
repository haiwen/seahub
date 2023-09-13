import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import RepoTag from '../../models/repo-tag';
import toaster from '../toast';
import CommonAddTool from '../common/common-add-tool';
import SearchInput from '../common/search-input';
import SeahubPopover from '../common/seahub-popover';
import TagItem from './tag-item';
import { KeyCodes, TAG_COLORS } from '../../constants';

import '../../css/repo-tag.css';
import '../../css/edit-filetag-popover.css';

class EditFileTagPopover extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repotagList: [],
      searchVal: '',
      highlightIndex: -1,
    };
  }

  componentDidMount() {
    this.getRepoTagList();
  }

  setHighlightIndex = (highlightIndex) => {
    this.setState({ highlightIndex });
  };

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
      let repoTagID = res.data.repo_tag.repo_tag_id;
      this.onRepoTagCreated(repoTagID);
      this.setState({
        searchVal: '',
        highlightIndex: -1,
      });
      this.getRepoTagList();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onRepoTagCreated = (repoTagID) => {
    let {repoID, filePath} = this.props;
    seafileAPI.addFileTag(repoID, filePath, repoTagID).then(() => {
      this.props.onFileTagChanged();
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
  };

  onKeyDown = (e) => {
    if (e.keyCode === KeyCodes.ChineseInputMethod || e.keyCode === KeyCodes.LeftArrow || e.keyCode === KeyCodes.RightArrow) {
      e.stopPropagation();
    }
    else if (e.keyCode === KeyCodes.Enter) {
      const searchText = this.state.searchVal.trim();
      const repotagList = this.state.repotagList.filter(item => item.name.includes(searchText));
      const tag = repotagList[this.state.highlightIndex];
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
      const repotagList = this.state.repotagList.filter(item => item.name.includes(searchText));
      if (this.state.highlightIndex < repotagList.length) {
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
    const repotagList = this.state.repotagList.filter(item => item.name.includes(searchText));
    const showAddTool = searchText && !this.state.repotagList.find(item => item.name === searchText);
    return (
      <SeahubPopover
        popoverClassName="edit-filetag-popover"
        target={this.props.target}
        hideSeahubPopover={this.props.toggleCancel}
        hideSeahubPopoverWithEsc={this.props.toggleCancel}
        canHideSeahubPopover={true}
      >
        <SearchInput
          className="edit-filetag-popover-input"
          placeholder={gettext('Find a tag')}
          onKeyDown={this.onKeyDown}
          onChange={this.onChangeSearch}
          autoFocus={true}
        />
        <ul className="tag-list-container">
          {repotagList.length === 0 &&
            <div className='tag-not-found mt-2 mb-4 mx-1'>{gettext('Tag not found')}</div>
          }
          {repotagList.length > 0 && repotagList.map((repoTag, index) => {
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
        {showAddTool &&
          <CommonAddTool
            callBack={this.createNewTag}
            footerName={`${gettext('Create a new tag')} '${searchText}'`}
          />
        }
      </SeahubPopover>
    );
  }
}

EditFileTagPopover.propTypes = {
  target: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

export default EditFileTagPopover;
