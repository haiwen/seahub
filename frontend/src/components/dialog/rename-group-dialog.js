import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Input, Button } from 'reactstrap';

class RenameGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newGroupName: '',
      errMessage: '',
    };
  }

  handleGroupNameChange = (event) => {
    let name = event.target.value;
    this.setState({
      newGroupName: name,
      errMessage: ''
    });
  }

  renameGroup = () => {
    let name = this.state.newGroupName.trim();
    if (name) {
      let that = this;
      seafileAPI.renameGroup(this.props.groupID, name).then((res)=> {
        that.props.loadGroup(this.props.groupID);
        that.props.toggleRenameGroupDialog();
        that.props.onGroupChanged(res.data.id);
      }).catch((error) => {
        if (error.response) {
          this.setState({
            errMessage: error.response.data.error_msg
          });
        }
      });
    }
    this.setState({
      newGroupName: '',
    });
  }

  handleKeyDown = (event) => {
    if (event.keyCode === 13) {
      this.renameGroup();
    }
  }

  render() {
    return(
      <Modal isOpen={this.props.showRenameGroupDialog} toggle={this.props.toggleRenameGroupDialog}>
        <ModalHeader>{gettext('Rename Group')}</ModalHeader>
        <ModalBody>
          <label htmlFor="newGroupName">{gettext('Rename group to')}</label>
          <Input type="text" id="newGroupName" value={this.state.newGroupName}
            onChange={this.handleGroupNameChange} onKeyDown={this.handleKeyDown}/>
          <span className="error">{this.state.errMessage}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleRenameGroupDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.renameGroup}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const RenameGroupDialogPropTypes = {
  showRenameGroupDialog: PropTypes.bool.isRequired,
  toggleRenameGroupDialog: PropTypes.func.isRequired,
  loadGroup: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  onGroupChanged: PropTypes.func.isRequired,
};

RenameGroupDialog.propTypes = RenameGroupDialogPropTypes;

export default RenameGroupDialog;