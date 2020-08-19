import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  repo: PropTypes.object.isRequired,
  isRepoDeleted: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
};

class DeleteRepoDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isRequestSended: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.isRepoDeleted) {
      this.setState({isRequestSended: false});
    }
  }

  toggle = () => {
    this.props.toggle();
  }

  onDeleteRepo = () => {
    this.setState({isRequestSended: true}, () => {
      this.props.onDeleteRepo(this.props.repo);
    });
  }

  render() {

    const { isRequestSended } = this.state;
    const repo = this.props.repo;
    const repoName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name || repo.name) + '</span>';
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
          <Button color="primary" disabled={isRequestSended} onClick={this.onDeleteRepo}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteRepoDialog.propTypes = propTypes;

export default DeleteRepoDialog;
