import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  onAddNewMembers: PropTypes.func.isRequired
};

class AddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errMessage: '',
    };
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  handleSubmit = () => {
    if (!this.state.selectedOption) return;
    const email = this.state.selectedOption[0].email;
    this.refs.orgSelect.clearSelect();
    this.setState({ errMessage: [] });
    orgAdminAPI.orgAdminAddGroupMember(orgID, this.props.groupID, email).then((res) => {
      this.setState({ selectedOption: null });
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
    const { errMessage } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</ModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
            ref="orgSelect"
            isMulti={false}
            className='org-add-member-select'
          />
          {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
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
