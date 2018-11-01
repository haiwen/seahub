import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';
import CreateTagDialog from '../dialog/create-tag-dialog';
import UpdateTagDialog from '../dialog/update-tag-dialog';

const propTypes = {
  listTagCancel: PropTypes.func.isRequired,
};

class ListTagDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repotagList: [],
      currentTag: null,
      createRepoTag: false,
      updateRepoTag: false,
    };
  }

  componentDidMount() {
    this.getTagList();
  }

  getTagList = () => {
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
    this.props.listTagCancel();
  }

  createTagClick = () => {
    this.setState({
      createRepoTag: !this.state.createRepoTag,
    });
  }

  createTagCancel = () => {
    this.setState({
      createRepoTag: !this.state.createRepoTag,
    });
  }

  updateTagClick = (item) => {
    this.setState({
      updateRepoTag: !this.state.updateRepoTag,
      currentTag: item,
    });
  }

  updateTagCancel = () => {
    this.setState({
      updateRepoTag: !this.state.updateRepoTag,
    });
  }

  render() {
    return (
      <Fragment>
        <Modal isOpen={true} toggle={this.toggle}>
          <ModalHeader toggle={this.toggle}>{gettext('Tags:')}</ModalHeader>
          <ModalBody>
            <ul>
              {this.state.repotagList.map((item) => { return (
              <li key={item.id} style={{width:400, height:60, listStyle:'none'}}>
                <span style={{background:item.color, borderRadius:5, width:360, height:50, lineHeight:'50px', float:'left'}}>{item.name}</span>
                <button className="fa fa-pencil" style={{float:'right', height:50,}} onClick={this.updateTagClick.bind(this, item)}></button>
              </li>
              );
            })}
            </ul>
            <div><a href={'#'} onClick={this.createTagClick}>{gettext('Create a new tag:')}</a></div>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.toggle}>{gettext('Yes')}</Button>
          </ModalFooter>
        </Modal>
        {this.state.createRepoTag &&
        <CreateTagDialog
          toggleCancel={this.createTagCancel}
        />
        }
        {this.state.updateRepoTag &&
        <UpdateTagDialog
          currentTag={this.state.currentTag}
          toggleCancel={this.updateTagCancel}
        />
        }
      </Fragment>
    );
  }
}

ListTagDialog.propTypes = propTypes;

export default ListTagDialog;
