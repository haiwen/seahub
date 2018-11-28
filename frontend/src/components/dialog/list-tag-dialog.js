import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';
import '../../css/repo-tag.css';

const tagListItemPropTypes = {
  item: PropTypes.object.isRequired,
  onTagUpdate: PropTypes.func.isRequired,
};

class TagListItem extends React.Component {
  
  onTagUpdate = () => {
    this.props.onTagUpdate(this.props.item);
  }

  render() {
    let color = this.props.item.color;
    return(
      <li className="tag-list-item">
        <span className={`tag-demo bg-${color}`}>{this.props.item.name}</span>
        <i className="tag-edit fa fa-pencil" onClick={this.onTagUpdate}></i>
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
    });
  }

  toggle = () => {
    this.props.onListTagCancel();
  }

  render() {
    return (
      <Fragment>
        <Modal isOpen={true} toggle={this.toggle}>
          <ModalHeader toggle={this.toggle}>{gettext('Tags')}</ModalHeader>
          <ModalBody>
            {
              this.state.repotagList.length === 0 && 
              <div className="tag-list tag-list-container">
                {gettext('Click new tag button to create tags.')}
              </div>
            }
            { this.state.repotagList.length > 0 &&
              <ul className="tag-list tag-list-container">
                {this.state.repotagList.map((repoTag, index) => {
                  return (
                    <TagListItem key={index} item={repoTag} onTagUpdate={this.props.onUpdateRepoTag}/>
                  );
                })}
              </ul>
            }
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.props.onCreateRepoTag}>{gettext('New Tag')}</Button>
            <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          </ModalFooter>
        </Modal>
      </Fragment>
    );
  }
}

ListTagDialog.propTypes = listTagPropTypes;

export default ListTagDialog;
