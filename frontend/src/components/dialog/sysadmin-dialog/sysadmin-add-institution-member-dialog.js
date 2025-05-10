import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addUser: PropTypes.func.isRequired
};

class AddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
    };
  }

  handleSelectChange = (option) => {
    this.setState({ selectedUsers: option });
  };

  handleSubmit = () => {
    if (!this.state.selectedUsers) return;
    const emails = this.state.selectedUsers.map(item => item.email);
    this.props.addUser(emails);
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
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddMemberDialog.propTypes = propTypes;

export default AddMemberDialog;
