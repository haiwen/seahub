import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import ListAndAddGroupMembers from '../list-and-add-group-members';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/manage-members-dialog.css';

const propTypes = {
  groupID: PropTypes.number.isRequired,
  isOwner: PropTypes.bool.isRequired,
  toggleManageMembersDialog: PropTypes.func,
  toggleDepartmentDetailDialog: PropTypes.func,
};

class ManageMembersDialog extends React.Component {

  render() {
    const { groupID, isOwner } = this.props;
    return (
      <Modal isOpen={true} toggle={this.props.toggleManageMembersDialog} className="group-manage-members-dialog">
        <SeahubModalHeader toggle={this.props.toggleManageMembersDialog}>{gettext('Manage group members')}</SeahubModalHeader>
        <ModalBody className="pb-0">
          <ListAndAddGroupMembers
            groupID={groupID}
            isOwner={isOwner}
            toggleManageMembersDialog={this.props.toggleManageMembersDialog}
            toggleDepartmentDetailDialog={this.props.toggleDepartmentDetailDialog}
          />
        </ModalBody>
      </Modal>
    );
  }
}

ManageMembersDialog.propTypes = propTypes;

export default ManageMembersDialog;
