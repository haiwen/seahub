import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const propTypes = {
  currentTable: PropTypes.object.isRequired,
  leaveShareCancel: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

class LeaveShareTableDialog extends React.Component {

  toggle = () => {
    this.props.leaveShareCancel();
  };

  render() {
    let currentTable = this.props.currentTable;
    let name = currentTable.name;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Leave Share Table')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Are you sure to leave share')}{' '}<b>{name}</b> ?</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

LeaveShareTableDialog.propTypes = propTypes;

export default LeaveShareTableDialog;
