import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';


const propTypes = {
  createRepo: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class SysAdminCreateRepoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      ownerEmail: '',
      errMessage: '',
      isSubmitBtnActive: false
    };
  }

  handleRepoNameChange = (e) => {
    const value = e.target.value;
    this.setState({
      repoName: value,
      isSubmitBtnActive: value.trim()
    });
  }

  handleSubmit = () => {
    const { repoName, ownerEmail } = this.state;
    this.props.createRepo(repoName.trim(), ownerEmail);
    this.toggle();
  }

  handleSelectChange = (option) => {
    // option can be null
    this.setState({
      ownerEmail: option ? option.email : ''
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  toggle = () => {
    this.props.toggleDialog();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false}>
        <ModalHeader toggle={this.toggle}>{gettext('New Library')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input
                id="repoName"
                onKeyPress={this.handleKeyPress}
                value={this.state.repoName}
                onChange={this.handleRepoNameChange}
                autoFocus={true}
              />
            </FormGroup>
            <FormGroup>
              <Label for="userSelect">
                {gettext('Owner')}
                <span className="small text-secondary">{gettext('(If left blank, owner will be admin)')}</span>
              </Label>
              <UserSelect
                id="userSelect"
                isMulti={false}
                className="reviewer-select"
                placeholder={gettext('Select a user')}
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
