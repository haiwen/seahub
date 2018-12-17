import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { Button, Modal, Input, ModalBody, Form, FormGroup, Label } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';


class LibDecryptDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      showError: false,
    };
  }

  handleSubmit = () => {
    let repoID = this.props.repoID;
    let password = this.state.password;
    seafileAPI.setRepoDecryptPassword(repoID, password).then(res => {
      this.props.onLibDecryptDialog();
    }).catch(res => {
      this.setState({
        showError: true
      });
    })
  } 

  handleChange = (e) => {
    this.setState({
      password: e.target.value,
      showError: false
    });
  }

  toggle = () => {
    window.location.href = siteRoot;
  };

  render() {
    return (
      <Modal isOpen={true} centered={true}>
        <ModalBody>
        <button type="button" className="close" onClick={this.toggle}><span aria-hidden="true">×</span></button> 
        <Form className="lib-decrypt-form text-center">
          <img src={siteRoot + 'media/img/lock.png'} alt=""/>
          <p>{gettext('This library is password protected')}</p>
          {this.state.showError &&
            <p className="error">{gettext('Wrong password')}</p>
          }
          <FormGroup>
            <Input type="password" name="password" placeholder={gettext('Password')} onChange={this.handleChange}/>
          </FormGroup>
          <Button onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          <br />
          <p className="tip">{'* '}{gettext('The password will be kept in the server for only 1 hour.')}</p>
        </Form>
        </ModalBody>
      </Modal>
    );
  }
}

export default LibDecryptDialog;
