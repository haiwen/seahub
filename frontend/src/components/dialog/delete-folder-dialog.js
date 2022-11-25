import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  deleteFolder: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class DeleteFolderDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      sharedToUserCount: 0,
      sharedToGroupCount: 0
    };
  }

  componentDidMount() {
    const { repoID, path } = this.props;
    seafileAPI.getRepoFolderShareInfo(repoID, path).then((res) => {
      this.setState({
        sharedToUserCount: res.data['shared_user_emails'].length,
        sharedToGroupCount: res.data['shared_group_ids'].length
      });
    });
  }

  deleteFolder = () => {
    this.props.deleteFolder();
    this.props.toggleDialog();
  }

  render() {
    const { sharedToUserCount, sharedToGroupCount } = this.state;
    const { path, toggleDialog } = this.props;
    const folderName = Utils.getFileName(path);
    const opTarget = '<span class="op-target">' + Utils.HTMLescape(folderName) + '</span>';
    const message = gettext('Are you sure you want to delete %s ?').replace('%s', opTarget);

    let alert_message = '';
    if (sharedToUserCount > 0 || sharedToGroupCount > 0) {
      alert_message = gettext('This folder has been shared to {user_amount} user(s) and {group_amount} group(s).')
        .replace('{user_amount}', sharedToUserCount)
        .replace('{group_amount}', sharedToGroupCount);
    }

    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <ModalHeader toggle={toggleDialog}>{gettext('Delete Folder')}</ModalHeader>
        <ModalBody>
          <p dangerouslySetInnerHTML={{__html: message}}></p>
          {alert_message && <p className="error">{alert_message}</p>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.deleteFolder}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteFolderDialog.propTypes = propTypes;

export default DeleteFolderDialog;
