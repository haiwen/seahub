import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import RepoTag from '../../models/repo-tag';

import '../../css/repo-tag.css';

const tagListItemPropTypes = {
  item: PropTypes.object.isRequired,
  onTagUpdate: PropTypes.func.isRequired,
  onListTaggedFiles: PropTypes.func.isRequired,
};

class TagListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showSelectedTag: false
    };
  }

  onMouseOver = () => {
    this.setState({
      showSelectedTag: true
    });
  }

  onMouseOut = () => {
    this.setState({
      showSelectedTag: false
    });
  }

  onTagUpdate = () => {
    this.props.onTagUpdate(this.props.item);
  }

  onListTaggedFiles = () => {
    this.props.onListTaggedFiles(this.props.item);
  }

  render() {
    let color = this.props.item.color;
    let drakColor = Utils.getDarkColor(color);
    const fileCount = this.props.item.fileCount;
    let fileTranslation = (fileCount === 1 || fileCount === 0) ? gettext('file') : gettext('files');
    return (
      <li className="tag-list-item">
        <div className="tag-demo" style={{backgroundColor:color}} onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
          <span className={`${this.state.showSelectedTag ? 'show-tag-selected': ''}`} style={{backgroundColor: drakColor}}></span>
          <span className="tag-name">{this.props.item.name}</span>
          <span className="tag-files" onClick={this.onListTaggedFiles}>
            {fileCount}{' '}{fileTranslation}
          </span>
        </div>
        <i className="tag-edit fa fa-pencil-alt" onClick={this.onTagUpdate}></i>
      </li>
    );
  }
}

TagListItem.propTypes = tagListItemPropTypes;

const listTagPropTypes = {
  repoID: PropTypes.string.isRequired,
  onListTagCancel: PropTypes.func.isRequired,
  onCreateRepoTag: PropTypes.func.isRequired,
  onUpdateRepoTag: PropTypes.func.isRequired,
  onListTaggedFiles: PropTypes.func.isRequired,
};

class ListTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repotagList: [],
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
        repotagList: repotagList,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggle = () => {
    this.props.onListTagCancel();
  }

  createNewTag = (e) => {
    e.preventDefault();
    this.props.onCreateRepoTag();
  }

  render() {
    return (
      <Fragment>
        <ModalHeader toggle={this.toggle}>{gettext('Tags')}</ModalHeader>
        <ModalBody>
          <ul className="tag-list tag-list-container">
            {this.state.repotagList.map((repoTag, index) => {
              return (
                <TagListItem
                  key={index}
                  item={repoTag}
                  onTagUpdate={this.props.onUpdateRepoTag}
                  onListTaggedFiles={this.props.onListTaggedFiles}
                />
              );
            })}
          </ul>
          <a href="#" className="add-tag-link" onClick={this.createNewTag}>{gettext('Create a new tag')}</a>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Fragment>
    );
  }
}

ListTagDialog.propTypes = listTagPropTypes;

export default ListTagDialog;
