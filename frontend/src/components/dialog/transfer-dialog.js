import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { seafileAPI } from '../../utils/seafile-api.js';
import { gettext, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import UserSelect from '../user-select';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  canTransferToDept: PropTypes.bool
};

class TransferDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
      transferToUser: true,
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  }

  submit = () => {
    let user = this.state.selectedOption;
    this.props.submit(user);
  }

  componentDidMount() {
    if (isPro) {
      seafileAPI.listDepartments().then((res) => {
        for (let i = 0 ; i < res.data.length; i++) {
          let obj = {};
          obj.value = res.data[i].name;
          obj.email = res.data[i].email;
          obj.label = res.data[i].name;
          this.options.push(obj);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onClick = () => {
    this.setState({
      transferToUser: !this.state.transferToUser,
    });
  }

  render() {
    const itemName = this.props.itemName;
    let canTransferToDept = true;
    if (this.props.canTransferToDept != undefined) {
      canTransferToDept = this.props.canTransferToDept;
    }
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggleDialog}>
          <span>{gettext('Transfer Library {library_name}').replace('{library_name}', itemName)}</span>
        </ModalHeader>
        <ModalBody>
          {this.state.transferToUser ?
            <UserSelect
              ref="userSelect"
              isMulti={false}
              className="reviewer-select"
              placeholder={gettext('Select a user')}
              onSelectChange={this.handleSelectChange}
            /> :
            <Select
              isClearable
              isMulti={false}
              maxMenuHeight={200}
              hideSelectedOptions={true}
              components={makeAnimated()}
              placeholder={gettext('Select a department')}
              options={this.options}
              onChange={this.handleSelectChange}
            />
          }
          {isPro && canTransferToDept &&
            <span role="button" tabIndex="0" className="action-link" onClick={this.onClick} onKeyDown={Utils.onKeyDown}>{this.state.transferToUser ?
              gettext('Transfer to department'): gettext('Transfer to user')}
            </span>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

TransferDialog.propTypes = propTypes;

export default TransferDialog;
