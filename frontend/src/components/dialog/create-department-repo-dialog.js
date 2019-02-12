import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext, maxFileName } from '../../utils/constants';

const propTypes = {
  onCreateRepo: PropTypes.func.isRequired,
  onCreateToggle: PropTypes.func.isRequired
};

class CreateDepartmentRepoDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      errMessage: '',
    };
    this.newInput = React.createRef();
  }

  handleChange = (e) => {
    this.setState({
      repoName: e.target.value, 
    });
  }

  handleSubmit = () => {
    let isValid = this.validateRepoName();
    if (isValid) {
      let repo = this.createRepo(this.state.repoName);
      this.props.onCreateRepo(repo, 'department');
    }
  } 

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  toggle = () => {
    this.props.onCreateToggle();
  }

  componentDidMount = () => {
    this.newInput.focus();
  }

  validateRepoName = () => {
    let errMessage = '';
    let repoName = this.state.repoName.trim();
    if (!repoName.length) {
      errMessage = gettext('Name is required');
      this.setState({errMessage: errMessage});
      return false;
    }
    if (repoName.indexOf('/') > -1) {
      errMessage = gettext('Name should not include \'/\'.');
      this.setState({errMessage: errMessage});
      return false;
    }

    return true;
  }

  createRepo = (repoName) => {
    let repo = { repo_name: repoName };
    return repo;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Department Library')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repo-name">{gettext('Name')}</Label>
              <Input 
                id="repo-name" 
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                value={this.state.repoName} 
                onChange={this.handleChange}
                maxLength={maxFileName}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateDepartmentRepoDialog.propTypes = propTypes;

export default CreateDepartmentRepoDialog;
