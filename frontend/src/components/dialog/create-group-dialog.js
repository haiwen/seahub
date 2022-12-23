import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Input, Button } from 'reactstrap';
import { Utils } from '../../utils/utils';

class CreateGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      errorMsg: '',
      isSubmitBtnActive: false,
    };
  }

  handleGroupChange = (event) => {
    let name = event.target.value;

    if (!name.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }
    this.setState({
      groupName: name
    });
    if (this.state.errorMsg) {
      this.setState({
        errorMsg: ''
      });
    }
  }

  handleSubmitGroup = () => {
    let name = this.state.groupName.trim();
    if (name) {
      let that = this;
      seafileAPI.createGroup(name).then((res)=> {
        that.props.onCreateGroup();
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        this.setState({errorMsg: errorMsg});
      });
    } else {
      this.setState({
        errorMsg: gettext('Name is required')
      });
    }
    this.setState({
      groupName: '',
    });
  }

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      this.handleSubmitGroup();
      e.preventDefault();
    }
  }

  render() {
    return(
      <Modal isOpen={this.props.showAddGroupModal} toggle={this.props.toggleAddGroupModal} autoFocus={false}>
        <ModalHeader toggle={this.props.toggleAddGroupModal}>{gettext('New Group')}</ModalHeader>
        <ModalBody>
          <label htmlFor="groupName">{gettext('Name')}</label>
          <Input
            type="text"
            id="groupName"
            value={this.state.groupName}
            onChange={this.handleGroupChange}
            onKeyDown={this.handleKeyDown}
            autoFocus={true}
          />
          <span className="error">{this.state.errorMsg}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleAddGroupModal}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmitGroup} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const CreateGroupDialogPropTypes = {
  toggleAddGroupModal: PropTypes.func.isRequired,
  onCreateGroup: PropTypes.func.isRequired,
  showAddGroupModal: PropTypes.bool.isRequired,
};

CreateGroupDialog.propTypes = CreateGroupDialogPropTypes;

export default CreateGroupDialog;