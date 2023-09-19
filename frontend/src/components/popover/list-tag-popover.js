import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import RepoTag from '../../models/repo-tag';
import TagListItem from './tag-list-item';
import TagListFooter from './tag-list-footer';

import '../../css/repo-tag.css';
import './list-tag-popover.css';

class ListTagPopover extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repotagList: []
    };
  }

  componentDidMount() {
    let repoID = this.props.repoID;
    seafileAPI.listRepoTags(repoID).then(res => {
      let repotagList = [];
      res.data.repo_tags.forEach(item => {
        let repo_tag = new RepoTag(item);
        repotagList.push(repo_tag);
      });
      this.setState({
        repotagList: repotagList
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggle = () => {
    this.props.onListTagCancel();
  };

  // TODO
  createNewTag = (e) => {
    e.preventDefault();
    console.log('create new tag');
    // 新加一个 virtual tag 然后可以选择颜色，可以输入名称，当输入回车，或者失去焦点时，直接保存到服务器
    // let name = '';
    // let color = '#46A1FD';
    // let repoID = this.props.repoID;
    // seafileAPI.createRepoTag(repoID, name, color).then((res) => {
    //   let repoTagID = res.data.repo_tag.repo_tag_id;
    //   // if (this.props.onRepoTagCreated) this.props.onRepoTagCreated(repoTagID);
    //   // this.props.toggleCancel();
    //   console.log(res.data.repo_tag);
    // }).catch((error) => {
    //   let errMessage;
    //   if (error.response.status === 500) {
    //     errMessage = gettext('Internal Server Error');
    //   } else if (error.response.status === 400) {
    //     errMessage = gettext('Tag "{name}" already exists.');
    //     errMessage = errMessage.replace('{name}', Utils.HTMLescape(name));
    //   }
    //   // this.setState({errorMsg: errMessage});
    //   console.log(errMessage);
    // });
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

  render() {
    return (
      <Fragment>
        <ul className="tag-list tag-list-container my-2">
          {this.state.repotagList.map((repoTag, index) => {
            return (
              <TagListItem
                key={index}
                item={repoTag}
                repoID={this.props.repoID}
                onDeleteTag={this.onDeleteTag}
              />
            );
          })}
        </ul>
        <div className="add-tag-link px-4 py-2 d-flex align-items-center" onClick={this.createNewTag}>
          <span className="sf2-icon-plus mr-2"></span>
          {gettext('Create a new tag')}
        </div>
        <TagListFooter toggle={this.toggle} repotagList={this.state.repotagList}/>
      </Fragment>
    );
  }
}

ListTagPopover.propTypes = {
  repoID: PropTypes.string.isRequired,
  onListTagCancel: PropTypes.func.isRequired,
};

export default ListTagPopover;
