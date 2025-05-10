import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

class LeaveGroupDialog extends React.Component {

  leaveGroup = () => {
    const { groupID } = this.props;
    seafileAPI.quitGroup(groupID, username).then((res) => {
      this.props.onLeavingGroup();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>{gettext('Leave Group')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Really want to leave this group?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.leaveGroup}>{gettext('Leave')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const LeaveGroupDialogPropTypes = {
  groupID: PropTypes.number.isRequired,
  onLeavingGroup: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

LeaveGroupDialog.propTypes = LeaveGroupDialogPropTypes;

export default LeaveGroupDialog;
