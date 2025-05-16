import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { Modal, ModalBody, ModalFooter, Input, Label, Button } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import toaster from '../toast';

class RenameGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newGroupName: this.props.groupName,
      isSubmitBtnActive: false,
    };
  }

  handleGroupNameChange = (event) => {
    if (!event.target.value.trim()) {
      this.setState({ isSubmitBtnActive: false });
    } else {
      this.setState({ isSubmitBtnActive: true });
    }

    let name = event.target.value;
    this.setState({
      newGroupName: name
    });
  };

  handleSubmit = () => {
    const { groupID } = this.props;
    const { newGroupName } = this.state;
    seafileAPI.renameGroup(groupID, newGroupName.trim()).then((res) => {
      const { name } = res.data;
      this.props.onGroupNameChanged(name);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.props.toggleDialog();
  };

  handleKeyDown = (event) => {
    if (event.keyCode === 13) {
      this.handleSubmit();
    }
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>{gettext('Rename Group')}</SeahubModalHeader>
        <ModalBody>
          <Label for="group-name">{gettext('Rename group to')}</Label>
          <Input
            type="text"
            id="group-name"
            value={this.state.newGroupName}
            onChange={this.handleGroupNameChange}
            onKeyDown={this.handleKeyDown}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const RenameGroupDialogPropTypes = {
  toggleDialog: PropTypes.func.isRequired,
  groupID: PropTypes.number,
  onGroupNameChanged: PropTypes.func.isRequired,
  groupName: PropTypes.string.isRequired,
};

RenameGroupDialog.propTypes = RenameGroupDialogPropTypes;

export default RenameGroupDialog;
