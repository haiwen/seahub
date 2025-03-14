import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalBody, ModalFooter, Label, Input, Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

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
      this.setState({ isSubmitBtnActive: false });
    } else {
      this.setState({ isSubmitBtnActive: true });
    }
    this.setState({
      groupName: name
    });
    if (this.state.errorMsg) {
      this.setState({
        errorMsg: ''
      });
    }
  };

  handleSubmitGroup = () => {
    let name = this.state.groupName.trim();
    if (name) {
      let that = this;
      seafileAPI.createGroup(name).then((res) => {
        that.props.onCreateGroup(res.data);
        this.props.toggleDialog();
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        this.setState({ errorMsg: errorMsg });
      });
    } else {
      this.setState({
        errorMsg: gettext('Name is required')
      });
    }
    this.setState({
      groupName: '',
    });
  };

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      this.handleSubmitGroup();
      e.preventDefault();
    }
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog} autoFocus={false}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>{gettext('New Group')}</SeahubModalHeader>
        <ModalBody>
          <Label for="groupName">{gettext('Name')}</Label>
          <Input
            type="text"
            id="groupName"
            name="group-name"
            value={this.state.groupName}
            onChange={this.handleGroupChange}
            onKeyDown={this.handleKeyDown}
            autoFocus={true}
          />
          <span className="error">{this.state.errorMsg}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmitGroup} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const CreateGroupDialogPropTypes = {
  toggleDialog: PropTypes.func.isRequired,
  onCreateGroup: PropTypes.func.isRequired
};

CreateGroupDialog.propTypes = CreateGroupDialogPropTypes;

export default CreateGroupDialog;
