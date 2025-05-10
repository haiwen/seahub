import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  createRepo: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class SysAdminCreateRepoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      selectedUsers: [],
      errMessage: '',
      isSubmitBtnActive: false
    };
  }

  handleRepoNameChange = (e) => {
    const value = e.target.value;
    this.setState({
      repoName: value,
      isSubmitBtnActive: value.trim()
    });
  };

  handleSubmit = () => {
    const { repoName, selectedUsers } = this.state;
    this.props.createRepo(repoName.trim(), selectedUsers[0].email);
    this.toggle();
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
        <SeahubModalHeader toggle={this.toggle}>{gettext('New Library')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input
                id="repoName"
                onKeyDown={this.handleKeyDown}
                value={this.state.repoName}
                onChange={this.handleRepoNameChange}
                autoFocus={true}
              />
            </FormGroup>
            <FormGroup>
              <Label for="userSelect">
                {gettext('Owner')}
                <span className="small text-secondary ml-1">{gettext('(If left blank, owner will be admin)')}</span>
              </Label>
              <UserSelect
                id="userSelect"
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

SysAdminCreateRepoDialog.propTypes = propTypes;

export default SysAdminCreateRepoDialog;
