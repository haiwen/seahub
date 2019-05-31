import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';


const propTypes = {
  createWorkSpace: PropTypes.func.isRequired,
  onCreateToggle: PropTypes.func.isRequired,
};

class CreateWorkSpaceDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      workspaceName: '',
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
  }

  handleNameChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({workspaceName: e.target.value});
  }

  handleSubmit = () => {
    let isValid= this.validateInputParams();
    if (isValid) {
      let workspaceName = this.state.workspaceName.trim();
      this.props.createWorkSpace(workspaceName);
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

  componentDidMount() {
    this.newInput.focus();
  }

  validateInputParams() {
    let errMessage = '';
    let workspaceName = this.state.workspaceName.trim();
    if (!workspaceName.length) {
      errMessage = gettext('Name is required');
      this.setState({errMessage: errMessage});
      return false;
    }
    if (workspaceName.indexOf('/') > -1) {
      errMessage = gettext('Name should not include \'/\'.');
      this.setState({errMessage: errMessage});
      return false;
    }
    return true;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Library')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="workspaceName">{gettext('Name')}</Label>
              <Input 
                id="workspaceName"
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                value={this.state.workspaceName} 
                onChange={this.handleNameChange}
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

CreateWorkSpaceDialog.propTypes = propTypes;

export default CreateWorkSpaceDialog;
