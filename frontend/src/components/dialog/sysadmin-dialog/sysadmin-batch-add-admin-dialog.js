import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import UserSelect from '../../user-select';
import { gettext } from '../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addAdminInBatch: PropTypes.func.isRequired,
};

class SysAdminBatchAddAdminDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      isSubmitBtnActive: false
    };
  }

  toggle = () => {
    this.props.toggle();
  };

  handleSelectChange = (selectedUsers) => {
    this.setState({
      selectedUsers: selectedUsers,
      isSubmitBtnActive: selectedUsers.length > 0
    });
  };

  handleSubmit = () => {
    this.props.addAdminInBatch(this.state.selectedUsers.map(item => item.email));
    this.toggle();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Add Admin')}</SeahubModalHeader>
        <ModalBody>
          <UserSelect
            isMulti={true}
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
            selectedUsers={this.state.selectedUsers}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminBatchAddAdminDialog.propTypes = propTypes;

export default SysAdminBatchAddAdminDialog;
