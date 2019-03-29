import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import UserSelect from '../user-select.js';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onMemberChanged: PropTypes.func.isRequired
};

class AddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errMessage: '',
    };
    this.Options = [];
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
    this.Options = [];
  }

  handleSubmit = () => {
    if (!this.state.selectedOption) return;
    const email = this.state.selectedOption.email;
    this.refs.orgSelect.clearSelect();
    this.setState({ errorMsg: [] });
    seafileAPI.orgAdminAddDepartGroupUser(orgID, this.props.groupID, email).then((res) => {
      if (res.data.failed) {
        this.setState({ errorMsg: res.data.failed[0] });
      }
      this.setState({
        selectedOption: null,
      });
      if (res.data.success) {
        this.props.onMemberChanged();
        this.props.toggle();
      }
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</ModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Please enter 1 or more character')}
            onSelectChange={this.handleSelectChange}
            ref="orgSelect"
            isMulti={false}
            className='org-add-member-select'
          />
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddMemberDialog.propTypes = propTypes;

export default AddMemberDialog;
