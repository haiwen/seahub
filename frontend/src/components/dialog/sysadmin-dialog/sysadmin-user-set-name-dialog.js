
import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onNameChanged: PropTypes.func.isRequired
};

class SysAdminUserSetNameDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleNameChange = (e) => {
    this.setState({name: e.target.value.trim()});
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  handleSubmit = () => {
    let { name } = this.state;
    this.props.onNameChanged(name);
  }

  render() {
    let { name } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set user name')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                value={name}
                onChange={this.handleNameChange}
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

SysAdminUserSetNameDialog.propTypes = propTypes;

export default SysAdminUserSetNameDialog;
