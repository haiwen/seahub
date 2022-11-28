import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
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
      sharedToUserCount: 0,
      sharedToGroupCount: 0,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.isRepoDeleted) {
      this.setState({isRequestSended: false});
    }
  }

  componentDidMount() {
    seafileAPI.getRepoFolderShareInfo(this.props.repo.repo_id).then((res) => {
      this.setState({
        sharedToUserCount: res.data['shared_user_emails'].length,
        sharedToGroupCount: res.data['shared_group_ids'].length,
      });
    })
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

    let alert_message = '';
    if (this.state.sharedToUserCount > 0 || this.state.sharedToGroupCount > 0) {
      alert_message = gettext('This library has been shared to {user_amount} user(s) and {group_amount} group(s).');
      alert_message = alert_message.replace('{user_amount}', this.state.sharedToUserCount);
      alert_message = alert_message.replace('{group_amount}', this.state.sharedToGroupCount);
    }

    const { toggle: toggleDialog } = this.props;

    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <ModalHeader toggle={toggleDialog}>{gettext('Delete Library')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
          { alert_message != '' && <p className="error" dangerouslySetInnerHTML={{__html: alert_message}}></p>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" disabled={isRequestSended} onClick={this.onDeleteRepo}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteRepoDialog.propTypes = propTypes;

export default DeleteRepoDialog;
