import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';
import { seafileAPI } from '../../utils/seafile-api';
import OrgUserInfo from '../../models/org-user';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onAddedOrgAdmin: PropTypes.func.isRequired,
};

class AddOrgAdminDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errMessage: '',
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
      errMessage: ''
    });
    this.options = [];
  }

  addOrgAdmin = () => {
    if (!this.state.selectedOption) return;
    const userEmail = this.state.selectedOption.email;
    seafileAPI.orgAdminSetOrgAdmin(orgID, userEmail, true).then(res => {
      let userInfo = new OrgUserInfo(res.data);
      this.props.onAddedOrgAdmin(userInfo);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Add Admins')}</ModalHeader>
        <ModalBody>
          <UserSelect
            ref="userSelect"
            isMulti={false}
            className="reviewer-select"
            placeholder={gettext('Select a user as admin...')}
            onSelectChange={this.handleSelectChange}
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
