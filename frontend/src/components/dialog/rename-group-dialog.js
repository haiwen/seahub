import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { Modal, ModalHeader, ModalBody, ModalFooter, Input, Button } from 'reactstrap';
import toaster from '../toast';

class RenameGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newGroupName: this.props.currentGroupName,
      isSubmitBtnActive: false,
    };
  }

  handleGroupNameChange = (event) => {
    if (!event.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    let name = event.target.value;
    this.setState({
      newGroupName: name
    });
  }

  renameGroup = () => {
    let name = this.state.newGroupName.trim();
    if (name) {
      let that = this;
      seafileAPI.renameGroup(this.props.groupID, name).then((res)=> {
        that.props.loadGroup(this.props.groupID);
        that.props.onGroupChanged(res.data.id);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    this.setState({
      newGroupName: '',
    });
    this.props.toggleRenameGroupDialog();
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
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleRenameGroupDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.renameGroup} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
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
  currentGroupName: PropTypes.string.isRequired,
};

RenameGroupDialog.propTypes = RenameGroupDialogPropTypes;

export default RenameGroupDialog;