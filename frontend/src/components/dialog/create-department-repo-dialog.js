import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext, maxFileName } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

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
      isSubmitBtnActive: false,
    };
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({ isSubmitBtnActive: false });
    } else {
      this.setState({ isSubmitBtnActive: true });
    }

    this.setState({
      repoName: e.target.value,
    });
  };

  handleSubmit = () => {
    let isValid = this.validateRepoName();
    if (isValid) {
      let repo = this.createRepo(this.state.repoName);
      this.props.onCreateRepo(repo, 'department');
    }
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  toggle = () => {
    this.props.onCreateToggle();
  };

  validateRepoName = () => {
    let errMessage = '';
    let repoName = this.state.repoName.trim();
    if (!repoName.length) {
      errMessage = gettext('Name is required');
      this.setState({ errMessage: errMessage });
      return false;
    }
    if (repoName.indexOf('/') > -1) {
      errMessage = gettext('Name should not include \'/\'.');
      this.setState({ errMessage: errMessage });
      return false;
    }

    return true;
  };

  createRepo = (repoName) => {
    let repo = { repo_name: repoName };
    return repo;
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle} autoFocus={false}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('New Department Library')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repo-name">{gettext('Name')}</Label>
              <Input
                id="repo-name"
                name="repo-name"
                onKeyDown={this.handleKeyDown}
                value={this.state.repoName}
                onChange={this.handleChange}
                maxLength={maxFileName}
                autoFocus={true}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateDepartmentRepoDialog.propTypes = propTypes;

export default CreateDepartmentRepoDialog;
