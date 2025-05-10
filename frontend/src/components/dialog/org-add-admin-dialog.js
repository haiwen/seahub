import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import { orgAdminAPI } from '../../utils/org-admin-api';
import OrgUserInfo from '../../models/org-user';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddedOrgAdmin: PropTypes.func.isRequired,
};

class AddOrgAdminDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      errMessage: '',
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedUsers: option,
      errMessage: ''
    });
    this.options = [];
  };

  addOrgAdmin = () => {
    if (!this.state.selectedUsers || this.state.selectedUsers.length === 0) return;
    const userEmail = this.state.selectedUsers[0].email;
    orgAdminAPI.orgAdminSetOrgAdmin(orgID, userEmail, true).then(res => {
      let userInfo = new OrgUserInfo(res.data);
      this.props.onAddedOrgAdmin(userInfo);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggle = () => {
    this.props.toggle();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Add Admin')}</SeahubModalHeader>
        <ModalBody>
          <UserSelect
            isMulti={false}
            placeholder={gettext('Select a user as admin')}
            onSelectChange={this.handleSelectChange}
            selectedUsers={this.state.selectedUsers}
          />
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.addOrgAdmin}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddOrgAdminDialog.propTypes = propTypes;

export default AddOrgAdminDialog;
