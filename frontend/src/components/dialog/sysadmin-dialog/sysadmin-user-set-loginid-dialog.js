
import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onLoginIDChanged: PropTypes.func.isRequired
};

class SysAdminUserSetLoginIDDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loginID: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleLoginIDChange = (e) => {
    this.setState({loginID: e.target.value.trim()});
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  handleSubmit = () => {
    let { loginID } = this.state;
    this.props.onLoginIDChanged(loginID);
  }

  render() {
    let { loginID } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set user Login ID')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                value={loginID}
                onChange={this.handleLoginIDChange}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminUserSetLoginIDDialog.propTypes = propTypes;

export default SysAdminUserSetLoginIDDialog;
