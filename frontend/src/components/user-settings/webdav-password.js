import React from 'react';
import { Button, Input, InputGroup, InputGroupAddon } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';

const { webdavPasswd } = window.app.pageOptions;

class WebdavPassword extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isPasswordHidden: true,
      password: webdavPasswd 
    };

    this.passwordInput = React.createRef();
  }

  handleInputChange = (e) => {
    let passwd = e.target.value.trim();
    this.setState({password: passwd}, () => {
      if (this.state.isPasswordHidden) {
        this.passwordInput.type = 'password';
      }
    });
  }

  togglePasswordVisible = () => {
    this.setState({isPasswordHidden: !this.state.isPasswordHidden}, () => {
      if (this.state.isPasswordHidden) {
        this.passwordInput.type = 'password';
      } else {
        this.passwordInput.type = 'text';
      }
    });
  }

  generatePassword = () => {
    let randomPassword = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 8; i++) {
      randomPassword += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    this.setState({
      password: randomPassword,
      isPasswordHidden: false,
    }, () => {
      this.passwordInput.type = 'text';
    });
  }

  updatePassword = (password) => {
    seafileAPI.updateWebdavSecret(password).then((res) => {
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errorMsg = ''; 
      if (error.response) {
        if (error.response.data && error.response.data['error_msg']) {
          errorMsg = error.response.data['error_msg'];
        } else {
          errorMsg = gettext('Error');
        }   
      } else {
        errorMsg = gettext('Please check the network.');
      }   
      toaster.danger(errorMsg);
    }); 
  }

  handleUpdate = () => {
    this.updatePassword(this.state.password);
  }

  handleDelete = () => {
    this.setState({password: ''});
    this.updatePassword('');
  }

  render() {
    return (
      <div id="update-webdav-passwd" className="setting-item">
        <h3 className="setting-item-heading">{gettext('WebDav Password')}</h3>
        <label>{gettext('Password')}</label>
        <div className="row mb-2">
          <InputGroup className="col-sm-5">
            <Input innerRef={input => {this.passwordInput = input}} value={this.state.password} onChange={this.handleInputChange} autoComplete="new-password"/>
            <InputGroupAddon addonType="append">
              <Button onClick={this.togglePasswordVisible}><i className={`fas ${this.state.isPasswordHidden ? 'fa-eye': 'fa-eye-slash'}`}></i></Button>
              <Button onClick={this.generatePassword}><i className="fas fa-magic"></i></Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <button className="btn btn-secondary mr-1" onClick={this.handleUpdate}>{gettext('Update')}</button>
        <button className="btn btn-secondary" onClick={this.handleDelete}>{gettext('Delete')}</button>
      </div>
    );
  }
}

export default WebdavPassword;
