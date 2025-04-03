import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

class DismissGroupDialog extends React.Component {

  dismissGroup = () => {
    const { groupID } = this.props;
    seafileAPI.deleteGroup(groupID).then((res) => {
      this.props.onGroupDeleted();
      toaster.success(gettext('Group deleted'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>{gettext('Delete Group')}</SeahubModalHeader>
        <ModalBody>
          <span>{gettext('Really want to delete this group?')}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.dismissGroup}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const DismissGroupDialogPropTypes = {
  groupID: PropTypes.number.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  onGroupDeleted: PropTypes.func.isRequired
};

DismissGroupDialog.propTypes = DismissGroupDialogPropTypes;

export default DismissGroupDialog;
