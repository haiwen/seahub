import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  createGroup: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class SysAdminCreateGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      selectedUsers: [],
      errMessage: '',
      isSubmitBtnActive: false
    };
  }

  handleRepoNameChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({ isSubmitBtnActive: false });
    } else {
      this.setState({ isSubmitBtnActive: true });
    }

    this.setState({ groupName: e.target.value });
  };

  handleSubmit = () => {
    let groupName = this.state.groupName.trim();
    let ownerEmail = '';
    if (this.state.selectedUsers.length > 0) {
      ownerEmail = this.state.selectedUsers[0].email;
    }
    this.props.createGroup(groupName, ownerEmail);
  };

  handleSelectChange = (selectedUsers) => {
    this.setState({
      selectedUsers: selectedUsers
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  toggle = () => {
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('New Group')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="groupName">{gettext('Name')}</Label>
              <Input
                id="groupName"
                onKeyDown={this.handleKeyDown}
                value={this.state.groupName}
                onChange={this.handleRepoNameChange}
                autoFocus={true}
              />
              <Label className="mt-2">
                {gettext('Owner')}
                <span className="small text-secondary ml-1">{gettext('(If left blank, owner will be admin)')}</span>
              </Label>
              <UserSelect
                isMulti={false}
                placeholder={gettext('Select a user')}
                onSelectChange={this.handleSelectChange}
                selectedUsers={this.state.selectedUsers}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminCreateGroupDialog.propTypes = propTypes;

export default SysAdminCreateGroupDialog;
