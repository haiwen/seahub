import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  addOrgAdmin: PropTypes.func.isRequired,
};

class AddOrgAdminDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null
    };
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
              <img src={res.data.users[i].avatar_url} className="select-module select-module-icon avatar" alt="Avatar"/>
              <span className='select-module select-module-name'>{res.data.users[i].name}</span>
            </Fragment>;
          this.options.push(obj);
        }
        callback(this.options);
      });
    }
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
    this.options = [];
  }

  addOrgAdmin = () => {
    let users = [];
    if (this.state.selectedOption && this.state.selectedOption.length > 0 ) {
      for (let i = 0; i < this.state.selectedOption.length; i ++) {
        users[i] = this.state.selectedOption[i].email;
      }
    }
    this.props.addOrgAdmin(users)
  }

  toggle = () => {
    this.props.toggle();
  } 

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader>{gettext('Add Admins')}</ModalHeader>
        <ModalBody>
          <AsyncSelect
            inputId={'react-select-1-input'}
            className='reviewer-select'
            placeholder={gettext('Select a user as admin...')}
            loadOptions={this.loadOptions}
            onChange={this.handleSelectChange}
            value={this.state.selectedOption}
            maxMenuHeight={200}
            isMulti
            isFocused
            isClearable
            classNamePrefix
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.addOrgAdmin}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddOrgAdminDialog.propTypes = propTypes;

export default AddOrgAdminDialog;
