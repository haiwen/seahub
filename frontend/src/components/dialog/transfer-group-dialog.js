import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api.js';
import UserSelect from '../user-select';

import '../../css/transfer-group-dialog.css';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  toggleTransferGroupDialog: PropTypes.func.isRequired,
  onGroupChanged: PropTypes.func.isRequired
};

class TransferGroupDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errMessage: '',
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
      errMessage: '',
    });
    this.options = [];
  }

  transferGroup = () => {
    const email = this.state.selectedOption && this.state.selectedOption.email;
    if (email) {
      seafileAPI.transferGroup(this.props.groupID, email).then((res) => {
        this.props.toggleTransferGroupDialog();
      }).catch((error) => {
        if (error.response) {
          this.setState({
            errMessage: error.response.data.error_msg
          });
        }
      });
    }
  }

  toggle = () => {
    this.props.toggleTransferGroupDialog();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Transfer Group')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Transfer group to')}</p>
          <UserSelect
            ref="userSelect"
            isMulti={false}
            className="reviewer-select"
            placeholder={gettext('Please enter 1 or more character')}
            onSelectChange={this.handleSelectChange}
          />
          <div className="error">{this.state.errMessage}</div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.transferGroup}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferGroupDialog.propTypes = propTypes;

export default TransferGroupDialog;
