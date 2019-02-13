import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import toaster from '../toast';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
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
      let message = gettext('Successfully transferred the library.');
      toaster.success(message);
      this.props.submit(repoID);
    }).catch(res => {
      let message = gettext('Failed. Please check the network.');
      this.props.toggleDialog();
      toaster.danger(message);
    });
  } 

  render() {
    const itemName = this.props.itemName;
    const innerSpan = '<span class="op-target" title=' + itemName + '>' + itemName +'</span>';
    let msg = gettext('Transfer Library {library_name} To');
    let message = msg.replace('{library_name}', innerSpan);
    return (
      <Modal isOpen={true} centered={true}>
        <ModalHeader toggle={this.props.toggleDialog}>
          <div dangerouslySetInnerHTML={{__html:message}} />
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
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalBody>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
