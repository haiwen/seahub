import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select.js';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addUser: PropTypes.func.isRequired
};

class AddMemberDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: [],
    };
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  }

  handleSubmit = () => {
    if (!this.state.selectedOption) return;
    const emails = this.state.selectedOption.map(item => item.email);
    this.props.addUser(emails);
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Add Member')}</ModalHeader>
        <ModalBody>
          <UserSelect
            placeholder={gettext('Search users...')}
            onSelectChange={this.handleSelectChange}
            isMulti={true}
            className='org-add-member-select'
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
