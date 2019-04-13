import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import UserSelect from '../user-select';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addOrgAdmin: PropTypes.func.isRequired,
};

class AddOrgAdminDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
    this.options = [];
  }

  addOrgAdmin = () => {
    if (this.state.selectedOption) {
      let userEmail = this.state.selectedOption.email;
      this.props.addOrgAdmin(userEmail);
    }
  }

  toggle = () => {
    this.props.toggle();
  } 

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader>{gettext('Add Admins')}</ModalHeader>
        <ModalBody>
          <UserSelect
            ref="userSelect"
            isMulti={false}
            className="reviewer-select"
            placeholder={gettext('Select a user as admin...')}
            onSelectChange={this.handleSelectChange}
          />
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
