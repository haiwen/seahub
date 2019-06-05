import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';


const propTypes = {
  createTable: PropTypes.func.isRequired,
  onAddTable: PropTypes.func.isRequired,
};

class CreateTableDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tableName: '',
      errMessage: '',
      isSubmitBtnActive: false,
    };
    this.newInput = React.createRef();
  }

  componentDidMount() {
    this.newInput.focus();
    this.newInput.setSelectionRange(0,0);
  }

  handleChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({isSubmitBtnActive: true});
    }

    this.setState({
      tableName: e.target.value, 
    }) ;
  }

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) {
      return;
    }

    let isValid = this.validateInputParams();
    if (isValid) {
      let newName = this.state.tableName.trim();
      this.props.createTable(newName);
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  toggle = () => {
    this.props.onAddTable();
  }

  validateInputParams = () => {
    let errMessage = '';
    let tableName = this.state.tableName.trim();
    if (!tableName.length) {
      errMessage = gettext('Name is required');
      this.setState({errMessage: errMessage});
      return false;
    }
    if (tableName.indexOf('/') > -1) {
      errMessage = gettext('Name should not include \'/\'.');
      this.setState({errMessage: errMessage});
      return false;
    }
    return true;
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('New Table')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="tableName">{gettext('Name')}</Label>
              <Input 
                id="tableName" 
                onKeyPress={this.handleKeyPress} 
                innerRef={input => {this.newInput = input;}} 
                value={this.state.tableName} 
                onChange={this.handleChange}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

CreateTableDialog.propTypes = propTypes;

export default CreateTableDialog;
