import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, Form, FormGroup } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  onLibDecryptDialog: PropTypes.func.isRequired
};


class LibDecryptDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      showError: false,
    };
  }

  handleSubmit = (e) => {
    let repoID = this.props.repoID;
    let password = this.state.password;
    seafileAPI.setRepoDecryptPassword(repoID, password).then(res => {
      this.props.onLibDecryptDialog();
    }).catch(res => {
      this.setState({
        showError: true
      });
    });

    e.preventDefault();
  } 

  handleKeyPress = (e) => {
    if (e.key == 'Enter') {
      this.handleSubmit(e);
    }
  };

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
              <Input type="password" name="password" onKeyPress={this.handleKeyPress} placeholder={gettext('Password')} onChange={this.handleChange}/>
            </FormGroup>
            <FormGroup>
              <Button type="submit" value="Submit" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
            </FormGroup>
            <p className="tip">{'* '}{gettext('The password will be kept in the server for only 1 hour.')}</p>
          </Form>
        </ModalBody>
      </Modal>
    );
  }
}

LibDecryptDialog.propTypes = propTypes;

export default LibDecryptDialog;
