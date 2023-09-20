import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import RepoTag from '../../models/repo-tag';
import TagListItem from './tag-list-item';
import VirtualTagListItem from './virtual-tag-list-item';
import TagListFooter from './tag-list-footer';
import { TAG_COLORS } from '../../constants/';

import '../../css/repo-tag.css';
import './list-tag-popover.css';

export default class ListTagPopover extends React.Component {

  static propTypes = {
    repoID: PropTypes.string.isRequired,
    onListTagCancel: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      repotagList: []
    };
  }

  componentDidMount() {
    this.loadTags();
  }

  loadTags = () => {
    seafileAPI.listRepoTags(this.props.repoID).then(res => {
      let repotagList = [];
      res.data.repo_tags.forEach(item => {
        let repo_tag = new RepoTag(item);
        repotagList.push(repo_tag);
      });
      this.setState({ repotagList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onDeleteTag = (tag) => {
    const { repoID } = this.props;
    const { id: targetTagID } = tag;
    seafileAPI.deleteRepoTag(repoID, targetTagID).then((res) => {
      this.setState({
        repotagList: this.state.repotagList.filter(tag => tag.id != targetTagID)
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  createVirtualTag = (e) => {
    e.preventDefault();
    let { repotagList } = this.state;
    let virtual_repo_tag = {
      name: '',
      color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)], // generate random tag color for virtual tag
      id: `virtual-tag-${uuidv4()}`,
      is_virtual: true,
    };
    repotagList.push(virtual_repo_tag);
    this.setState({ repotagList });
  };

  deleteVirtualTag = (virtualTag) => {
    let { repotagList } = this.state;
    let index = repotagList.findIndex(item => item.id === virtualTag.id);
    repotagList.splice(index, 1);
    this.setState({ repotagList });
  };

  updateVirtualTag = (virtualTag, data) => {
    const repoID = this.props.repoID;
    const { repotagList } = this.state;
    const index = repotagList.findIndex(item => item.id === virtualTag.id);
    if (index < 0) return null;

    // If virtual tag color is updated and virtual tag name is empty, it will be saved to local state, don't save it to the server
    if (data.color) {
      virtualTag.color = data.color;
      repotagList[index] = virtualTag;
      this.setState({ repotagList });
      return;
    }

    // If virtual tag name is updated and name is not empty, virtual tag color use default, save it to the server
    if (data.name && data.name.length > 0) {
      let color = virtualTag.color;
      let name = data.name;
      seafileAPI.createRepoTag(repoID, name, color).then((res) => {
        // After saving sag to the server, replace the virtual tag with newly created tag
        repotagList[index] = new RepoTag(res.data.repo_tag);
        this.setState({ repotagList });
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  render() {
    return (
      <Fragment>
        <ul className="tag-list tag-list-container my-2">
          {this.state.repotagList.map((repoTag, index) => {
            if (repoTag.is_virtual) {
              return (
                <VirtualTagListItem
                  key={index}
                  item={repoTag}
                  repoID={this.props.repoID}
                  deleteVirtualTag={this.deleteVirtualTag}
                  updateVirtualTag={this.updateVirtualTag}
                />
              );
            } else {
              return (
                <TagListItem
                  key={index}
                  item={repoTag}
                  repoID={this.props.repoID}
                  onDeleteTag={this.onDeleteTag}
                />
              );
            }
          })}
        </ul>
        <div className="add-tag-link px-4 py-2 d-flex align-items-center" onClick={this.createVirtualTag}>
          <span className="sf2-icon-plus mr-2"></span>
          {gettext('Create a new tag')}
        </div>
        <TagListFooter
          toggle={this.props.onListTagCancel}
          repotagList={this.state.repotagList}
          loadTags={this.loadTags}
          repoID={this.props.repoID}
        />
      </Fragment>
    );
  }
}
