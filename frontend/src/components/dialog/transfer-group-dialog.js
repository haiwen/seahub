import React from 'react';
import AsyncSelect from 'react-select/lib/Async';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';

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

  loadOptions = (value, callback) => {
    if (value.trim().length > 0) {
      seafileAPI.searchUsers(value.trim()).then((res) => {
        this.options = [];
        for (let i = 0 ; i < res.data.users.length; i++) {
          let obj = {};
          obj.value = res.data.users[i].name;
          obj.email = res.data.users[i].email;
          obj.label =
            <React.Fragment>
              <img src={res.data.users[i].avatar_url} className="avatar" alt=""/>
              <span className="transfer-group-name">{res.data.users[i].name}</span>
            </React.Fragment>;
          this.options.push(obj);
        }
        callback(this.options);
      });
    }
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
          <AsyncSelect
            className='group-transfer-select'
            isClearable classNamePrefix
            loadOptions={this.loadOptions}
            onChange={this.handleSelectChange}
            placeholder={gettext('Please enter 1 or more character')}
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
