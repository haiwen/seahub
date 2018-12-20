import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

class DismissGroupDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  dismissGroup = () => {
    let that = this;
    seafileAPI.deleteGroup(this.props.groupID).then((res)=> {
      that.props.onGroupChanged();
    });
  }

  render() {
    return(
      <Modal isOpen={this.props.showDismissGroupDialog} toggle={this.props.toggleDismissGroupDialog}>
        <ModalHeader>{gettext('Dismiss Group')}</ModalHeader>
        <ModalBody>
          <span>{gettext('Really want to dismiss this group?')}</span>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDismissGroupDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.dismissGroup}>{gettext('Dismiss')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const DismissGroupDialogPropTypes = {
  showDismissGroupDialog: PropTypes.bool.isRequired,
  toggleDismissGroupDialog: PropTypes.func.isRequired,
  loadGroup: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  onGroupChanged: PropTypes.func.isRequired,
};

DismissGroupDialog.propTypes = DismissGroupDialogPropTypes;

export default DismissGroupDialog;