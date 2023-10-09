import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import RepoTag from '../../models/repo-tag';
import toaster from '../toast';

export default class TagListFooter extends Component {

  static propTypes = {
    repoID: PropTypes.string.isRequired,
    toggle: PropTypes.func.isRequired,
    repotagList: PropTypes.array.isRequired,
    updateTags: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
    };
  }

  toggleTooltip = () => {
    this.setState({showTooltip: !this.state.showTooltip});
  };

  onClickImport = () => {
    this.importOptionsInput.click();
  };

  importTagsInputChange = () => {
    if (!this.importOptionsInput.files || !this.importOptionsInput.files.length) {
      toaster.warning(gettext('Please select a file'));
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = this.onImportTags.bind(this);
    fileReader.onerror = this.onImportTagsError.bind(this);
    fileReader.readAsText(this.importOptionsInput.files[0]);
  };

  getValidTags = (tags) => {
    let validTags = [];
    let tagNameMap = {};
    this.props.repotagList.forEach(tag => tagNameMap[tag.name] = true);
    for (let i = 0; i < tags.length; i++) {
      if (!tags[i] || typeof tags[i] !== 'object' || !tags[i].name || !tags[i].color) {
        continue;
      }
      if (!tagNameMap[tags[i].name]) {
        validTags.push(
          {
            name: tags[i].name,
            color: tags[i].color,
          }
        );
        tagNameMap[tags[i].name] = true;
      }
    }
    return validTags;
  };

  onImportTags = (event) => {
    let tags = [];
    try {
      tags = JSON.parse(event.target.result); // handle JSON file format is error
    } catch (error) {
      toaster.danger(gettext('The imported tags are invalid'));
      return;
    }
    if (!Array.isArray(tags) || tags.length === 0) {
      toaster.danger(gettext('The imported tags are invalid'));
      return;
    }
    let validTags = this.getValidTags(tags);
    if (validTags.length === 0) {
      toaster.warning(gettext('The imported tag already exists'));
      return;
    }
    seafileAPI.createRepoTags(this.props.repoID, validTags).then((res) => {
      toaster.success(gettext('Tags imported'));
      let repotagList = [];
      res.data.repo_tags.forEach(item => {
        let repo_tag = new RepoTag(item);
        repotagList.push(repo_tag);
      });
      this.props.updateTags(repotagList);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.importOptionsInput.value = null;
  };

  onImportTagsError = () => {
    toaster.success(gettext('Failed to import tags. Please reupload.'));
  };

  getDownloadUrl = () => {
    const tags = this.props.repotagList.map(item => {
      return { name: item.name, color: item.color };
    });
    return `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(tags))}`;
  };

  render() {
    return (
      <div className="tag-list-footer">
        <span className="fa fa-question-circle mr-2" style={{color: '#999'}} id="import-export-tags-tip"></span>
        <Tooltip
          toggle={this.toggleTooltip}
          delay={{show: 0, hide: 0}}
          target='import-export-tags-tip'
          placement='bottom'
          isOpen={this.state.showTooltip}
        >
          {gettext('Use the import/export function to transfer tags quickly to another library. (The export is in JSON format.)')}
        </Tooltip>
        <input
          type="file"
          ref={ref => this.importOptionsInput = ref}
          accept='.json'
          className="d-none"
          onChange={this.importTagsInputChange}
        />
        <span className="item-text" onClick={this.onClickImport}>{gettext('Import tags')}</span>
        <span className="mx-2">|</span>
        <a href={this.getDownloadUrl()} download='tags.json' onClick={this.props.toggle}>
          <span className="item-text">{gettext('Export tags')}</span>
        </a>
      </div>
    );
  }
}
