import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';

const propTypes = {
  member: PropTypes.object.isRequired,
  groupID: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  onMemberChanged: PropTypes.func.isRequired
};

class DeleteMemberDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  deleteMember = () => {
    const userEmail = this.props.member.email;
    seafileAPI.sysAdminDeleteGroupMember(this.props.groupID, userEmail).then((res) => {
      if (res.data.success) {
        this.props.onMemberChanged();
        this.props.toggle();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let tipMessage = gettext('Are you sure you want to delete {placeholder} ?');
    tipMessage = tipMessage.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.member.name) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Delete Member')}</ModalHeader>
        <ModalBody>
          <div dangerouslySetInnerHTML={{__html: tipMessage}}></div>
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
