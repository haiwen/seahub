import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Input, Button } from 'reactstrap';

class CreateGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
    };
  }

  handleGroupChange = (event) => {
    let name = event.target.value.trim();
    this.setState({
      groupName: name
    });
  }

  handleSubmitGroup = () => {
    let name = this.state.groupName.trim();
    if (name) {
      let that = this;
      seafileAPI.createGroup(name).then((res)=> {
        that.props.listGroups();
      });
    }
    this.setState({
      groupName: '',
    });
    this.props.toggleAddGroupModal();
  }

  render() {
    return(
      <Modal isOpen={this.props.showAddGroupModal} toggle={this.props.toggleAddGroupModal}>
        <ModalHeader toggle={this.toggle}>{gettext('New group')}</ModalHeader>
        <ModalBody>
          <label htmlFor="groupName">{gettext('Name')}</label>
          <Input type="text" id="groupName" value={this.state.groupName} onChange={this.handleGroupChange}/>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmitGroup}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.props.toggleAddGroupModal}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const CreateGroupDialogPropTypes = {
  toggleAddGroupModal: PropTypes.func.isRequired,
  listGroups: PropTypes.func.isRequired,
  showAddGroupModal: PropTypes.bool.isRequired,
};

CreateGroupDialog.propTypes = CreateGroupDialogPropTypes;

export default CreateGroupDialog;