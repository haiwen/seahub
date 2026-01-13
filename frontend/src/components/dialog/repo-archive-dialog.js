import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { userAPI } from '../../utils/user-api';
import toaster from '../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_COUNT = 150; // Max 5 minutes (150 * 2s)

const propTypes = {
  repo: PropTypes.object.isRequired,
  toggle: PropTypes.func.isRequired,
  onArchiveSuccess: PropTypes.func,
};

class RepoArchiveDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isSubmitting: false,
    };
    this.pollingTimer = null;
    this.pollingCount = 0;
    this.unmounted = false;
  }

  componentWillUnmount() {
    this.unmounted = true;
    this.clearPolling();
  }

  clearPolling = () => {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.pollingCount = 0;
  };

  queryTaskStatus = (taskId) => {
    this.pollingCount++;

    // Check if max polling count reached
    if (this.pollingCount > MAX_POLLING_COUNT) {
      this.clearPolling();
      // Timeout - just stop polling silently, user was already notified
      return;
    }

    userAPI.queryIOStatus(taskId, 'archive').then((res) => {
      const { is_finished, error } = res.data;

      if (is_finished) {
        this.clearPolling();

        if (error) {
          // Show error message
          toaster.danger(error);
        } else {
          // Task completed successfully, refresh page to show updated status
          window.location.reload();
        }
      } else {
        // Continue polling in background
        this.pollingTimer = setTimeout(() => {
          this.queryTaskStatus(taskId);
        }, POLLING_INTERVAL);
      }
    }).catch((error) => {
      this.clearPolling();
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onArchive = () => {
    const { repo } = this.props;
    this.setState({ isSubmitting: true });

    const isArchive = !repo.archive_status || repo.archive_status !== 'archived';
    const opType = isArchive ? 'archive' : 'unarchive';

    seafileAPI.archiveRepo(repo.repo_id, opType).then((res) => {
      const { task_id } = res.data;

      // Show immediate feedback message
      const message = isArchive
        ? gettext('The library is being archived. You will be notified once it is completed')
        : gettext('The library is being unarchived. You will be notified once it is completed');
      toaster.success(message);

      // Close dialog immediately
      this.props.toggle();
      if (this.props.onArchiveSuccess) {
        this.props.onArchiveSuccess();
      }

      // Start background polling if task_id is returned
      if (task_id) {
        this.queryTaskStatus(task_id);
      }
    }).catch((error) => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({ isSubmitting: false });
    });
  };

  render() {
    const { isSubmitting } = this.state;
    const { repo, toggle: toggleDialog } = this.props;
    const repoName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name) + '</span>';

    // Determine if this is archive or unarchive operation
    const isArchive = !repo.archive_status || repo.archive_status !== 'archived';
    const title = isArchive ? gettext('Archive Library') : gettext('Unarchive Library');
    const buttonText = isArchive ? gettext('Archive') : gettext('Unarchive');

    let message;
    if (isArchive) {
      message = gettext('Are you sure you want to archive {placeholder} ?');
    } else {
      message = gettext('Are you sure you want to unarchive {placeholder} ?');
    }
    message = message.replace('{placeholder}', repoName);

    let warningMessage = '';
    if (isArchive) {
      warningMessage = gettext('Archived libraries will be moved to archive storage. Users will not be able to access the library during the archive process.');
    } else {
      warningMessage = gettext('The library will be moved back to primary storage. Users will not be able to access the library during the unarchive process.');
    }

    return (
      <Modal isOpen={true} toggle={toggleDialog}>
        <SeahubModalHeader toggle={toggleDialog}>{title}</SeahubModalHeader>
        <ModalBody>
          <div className="pb-6">
            <p dangerouslySetInnerHTML={{ __html: message }}></p>
            {warningMessage && <p className="text-warning">{warningMessage}</p>}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" disabled={isSubmitting} onClick={this.onArchive}>{buttonText}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

RepoArchiveDialog.propTypes = propTypes;

export default RepoArchiveDialog;
