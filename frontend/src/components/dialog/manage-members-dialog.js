import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import ListAndAddGroupMembers from '../list-and-add-group-members';

import '../../css/manage-members-dialog.css';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
  toggleManageMembersDialog: PropTypes.func.isRequired
};

class ManageMembersDialog extends React.Component {

  render() {
    const { groupID, isOwner, toggleManageMembersDialog: toggle } = this.props;
    return (
      <Modal isOpen={true} toggle={toggle} className="group-manage-members-dialog">
        <ModalHeader toggle={toggle}>{gettext('Manage group members')}</ModalHeader>
        <ModalBody className="pb-0">
          <ListAndAddGroupMembers
            groupID={groupID}
            isOwner={isOwner}
          />
        </ModalBody>
      </Modal>
    );
  }
}

ManageMembersDialog.propTypes = propTypes;

export default ManageMembersDialog;
