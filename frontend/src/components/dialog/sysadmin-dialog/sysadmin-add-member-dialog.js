import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  onAddNewMembers: PropTypes.func.isRequired
};

class AddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      errMessage: '',
    };
  }

  handleSelectChange = (option) => {
    this.setState({ selectedUsers: option });
  };

  handleSubmit = () => {
    if (!this.state.selectedUsers) return;
    const emails = this.state.selectedUsers.map(item => item.email);
    this.setState({ errMessage: [] });
    systemAdminAPI.sysAdminAddGroupMember(this.props.groupID, emails).then((res) => {
      this.setState({ selectedUsers: [] });
      if (res.data.failed.length > 0) {
        this.setState({ errMessage: res.data.failed[0].error_msg });
      }
      if (res.data.success.length > 0) {
        this.props.onAddNewMembers(res.data.success);
        this.props.toggle();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</SeahubModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
            isMulti={true}
            className='org-add-member-select'
            selectedUsers={this.state.selectedUsers}
          />
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddMemberDialog.propTypes = propTypes;

export default AddMemberDialog;
