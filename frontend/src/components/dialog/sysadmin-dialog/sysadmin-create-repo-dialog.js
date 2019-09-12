import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';


const propTypes = {
  createRepo: PropTypes.func.isRequired,
  createRepoDialogToggle: PropTypes.func.isRequired,
};

class SysAdminCreateRepoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      ownerEmail: '',
      disabled: true,
      errMessage: '',
      isSubmitBtnActive: false
    };
    this.newInput = React.createRef();
  }

  handleRepoNameChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({repoName: e.target.value});
  }

  handleSubmit = () => {
    let repoName = this.state.repoName.trim();
    this.props.createRepo(repoName, this.state.ownerEmail);
  }

  handleSelectChange = (value) => {
    this.setState({
      ownerEmail: value.email
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  toggle = () => {
    this.props.createRepoDialogToggle();
  }

  componentDidMount() {
    this.newInput.focus();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Library')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                value={this.state.repoName} 
                onChange={this.handleRepoNameChange}
              />
              <Label for="userSelect" className="mt-2">{gettext('Owner')}</Label>
              <UserSelect
                id="userSelect"
                isMulti={false}
                className="reviewer-select"
                placeholder={gettext('Select user...')}
                onSelectChange={this.handleSelectChange}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminCreateRepoDialog.propTypes = propTypes;

export default SysAdminCreateRepoDialog;
