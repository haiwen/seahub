import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

class TransferDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      sharedItems: []
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
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
            <Fragment>
              <img src={res.data.users[i].avatar_url} className="avatar reviewer-select-avatar" alt=""/>
              <span className='reviewer-select-name'>{res.data.users[i].name}</span>
            </Fragment>;
          this.options.push(obj);
        }
        callback(this.options);
      });
    }
  }

  submit = () => {
    let repoID = this.props.repoID;
    let user = this.state.selectedOption.email;
    seafileAPI.transferRepo(repoID, user).then(res => {
      this.props.submit(repoID);
      this.props.toggleDialog();
    })
  } 

  render() {
    const itemName = this.props.itemName;
    return (
      <Modal isOpen={true} centered={true}>
        <ModalHeader toggle={this.props.toggleDialog}>
        {gettext('Transfer Library')} <span className="sf-font" title={itemName}>{itemName}</span> {gettext('TO')}
        </ModalHeader>
        <ModalBody>
          <AsyncSelect
            className='reviewer-select' isFocused
            loadOptions={this.loadOptions}
            placeholder={gettext('Please enter 1 or more character')}
            onChange={this.handleSelectChange}
            isClearable classNamePrefix
            inputId={'react-select-transfer-input'}
          /><br />
          <Button onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalBody>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
