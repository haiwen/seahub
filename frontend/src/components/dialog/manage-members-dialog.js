import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import ListAndAddGroupMembers from '../list-and-add-group-members';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/manage-members-dialog.css';

const propTypes = {
  groupID: PropTypes.string,
  isOwner: PropTypes.bool.isRequired,
  toggleManageMembersDialog: PropTypes.func.isRequired
};

class ManageMembersDialog extends React.Component {

  render() {
    const { groupID, isOwner, toggleManageMembersDialog: toggle } = this.props;
    return (
      <Modal isOpen={true} toggle={toggle} className="group-manage-members-dialog">
        <SeahubModalHeader toggle={toggle}>{gettext('Manage group members')}</SeahubModalHeader>
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
