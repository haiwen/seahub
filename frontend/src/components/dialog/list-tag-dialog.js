import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import RepoTag from '../../models/repo-tag';
import TagColor from './tag-color';
import TagName from './tag-name';

import '../../css/repo-tag.css';

const tagListItemPropTypes = {
  item: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  onDeleteTag : PropTypes.func.isRequired
};

class TagListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTagHighlighted: false
    };
  }

  onMouseOver = () => {
    this.setState({
      isTagHighlighted: true
    });
  }

  onMouseOut = () => {
    this.setState({
      isTagHighlighted: false
    });
  }

  deleteTag = () => {
    this.props.onDeleteTag(this.props.item);
  }

  render() {
    const { isTagHighlighted } = this.state;
    const { item, repoID } = this.props;
    return (
      <li
        className={`tag-list-item px-4 d-flex justify-content-between align-items-center ${isTagHighlighted ? 'hl' : ''}`}
        onMouseOver={this.onMouseOver}
        onMouseOut={this.onMouseOut}
      >
        <TagColor repoID={repoID} tag={item} />
        <TagName repoID={repoID} tag={item} />
        <button
          className={`tag-delete-icon sf2-icon-delete border-0 px-0 bg-transparent cursor-pointer ${isTagHighlighted ? '' : 'invisible'}`}
          onClick={this.deleteTag}
          aria-label={gettext('Delete')}
          title={gettext('Delete')}
        ></button>
      </li>
    );
  }
}

TagListItem.propTypes = tagListItemPropTypes;

const listTagPropTypes = {
  repoID: PropTypes.string.isRequired,
  onListTagCancel: PropTypes.func.isRequired,
  onCreateRepoTag: PropTypes.func.isRequired
};

class ListTagDialog extends React.Component {
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
  }

  createNewTag = (e) => {
    e.preventDefault();
    this.props.onCreateRepoTag();
  }

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
  }

  render() {
    return (
      <Fragment>
        <ModalHeader toggle={this.toggle}>{gettext('Tags')}</ModalHeader>
        <ModalBody className="px-0">
          <ul className="tag-list tag-list-container">
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
          <a
            href="#"
            className="add-tag-link px-4 py-2 d-flex align-items-center"
            onClick={this.createNewTag}
          >
            <span className="sf2-icon-plus mr-2"></span>
            {gettext('Create a new tag')}
          </a>
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
