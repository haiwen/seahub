import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import UserSelect from '../user-select';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

import '../../css/transfer-group-dialog.css';

const propTypes = {
  groupID: PropTypes.number.isRequired,
  onGroupTransfered: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class TransferGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: []
    };
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedUsers: option
    });
  };

  transferGroup = () => {
    let selectedUsers = this.state.selectedUsers;
    let email;
    if (selectedUsers && selectedUsers[0]) {
      email = selectedUsers[0].email;
    }
    if (!email) {
      return false;
    }
    seafileAPI.transferGroup(this.props.groupID, email).then((res) => {
      toaster.success(gettext('Group has been transfered'));
      this.props.onGroupTransfered(res.data);
      this.props.toggleDialog();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggle = () => {
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Transfer Group')}</SeahubModalHeader>
        <ModalBody>
          <p>{gettext('Transfer group to')}</p>
          <UserSelect
            isMulti={false}
            placeholder={gettext('Please enter 1 or more character')}
            onSelectChange={this.handleSelectChange}
            selectedUsers={this.state.selectedUsers}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.transferGroup}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferGroupDialog.propTypes = propTypes;

export default TransferGroupDialog;
