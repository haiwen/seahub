import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  repo: PropTypes.object.isRequired,
  toggle: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
};

class DeleteRepoDialog extends Component {

  toggle = () => {
    this.props.toggle();
  }

  onDeleteRepo = () => {
    this.props.onDeleteRepo(this.props.repo);
  }

  render() {

    const repo = this.props.repo;
    let repo_name;
    if (repo.repo_name) {
      repo_name = repo.repo_name;
    } else {
      repo_name = repo.name;
    }
    const repoName = '<span class="op-target">' + Utils.HTMLescape(repo_name) + '</span>';
    let message = gettext('Are you sure you want to delete %s ?');
    message = message.replace('%s', repoName);

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Delete Library')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.onDeleteRepo}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteRepoDialog.propTypes = propTypes;

export default DeleteRepoDialog;
