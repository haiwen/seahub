import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addMembers: PropTypes.func.isRequired
};

class SysAdminGroupAddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      isSubmitBtnDisabled: true
    };
  }

  handleSelectChange = (options) => {
    this.setState({
      selectedUsers: options,
      isSubmitBtnDisabled: !options.length
    });
  };

  addMembers = () => {
    let emails = this.state.selectedUsers.map(item => item.email);
    this.props.addMembers(emails);
    this.props.toggle();
  };

  render() {
    const { isSubmitBtnDisabled } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</SeahubModalHeader>
        <ModalBody>
          <UserSelect
            isMulti={true}
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
            selectedUsers={this.state.selectedUsers}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.addMembers} disabled={isSubmitBtnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminGroupAddMemberDialog.propTypes = propTypes;

export default SysAdminGroupAddMemberDialog;
