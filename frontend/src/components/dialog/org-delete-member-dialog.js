import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  member: PropTypes.object.isRequired,
  groupID: PropTypes.string,
  toggle: PropTypes.func.isRequired,
  onMemberChanged: PropTypes.func.isRequired
};

class DeleteMemberDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  deleteMember = () => {
    const userEmail = this.props.member.email;
    orgAdminAPI.orgAdminDeleteGroupMember(orgID, this.props.groupID, userEmail).then((res) => {
      if (res.data.success) {
        this.props.onMemberChanged();
        this.props.toggle();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    let subtitle = gettext('Are you sure you want to delete {placeholder} ?');
    subtitle = subtitle.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.member.name) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Delete Member')}</SeahubModalHeader>
        <ModalBody>
          <div dangerouslySetInnerHTML={{ __html: subtitle }}></div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.deleteMember}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

DeleteMemberDialog.propTypes = propTypes;

export default DeleteMemberDialog;
