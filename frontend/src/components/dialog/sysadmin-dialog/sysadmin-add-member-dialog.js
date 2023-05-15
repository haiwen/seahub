import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, orgID } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import UserSelect from '../../user-select.js';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  groupID:  PropTypes.string.isRequired,
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
  }

  handleSubmit = () => {
    if (!this.state.selectedOption) return;
    const emails = this.state.selectedOption.map(item => item.email);
    this.refs.orgSelect.clearSelect();
    this.setState({ errMessage: [] });
    seafileAPI.sysAdminAddGroupMember(this.props.groupID, emails).then((res) => {
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
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</ModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Search users...')}
            onSelectChange={this.handleSelectChange}
            ref="orgSelect"
            isMulti={true}
            className='org-add-member-select'
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
