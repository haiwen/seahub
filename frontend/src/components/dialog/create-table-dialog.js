import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import makeAnimated from 'react-select/lib/animated';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Button, Modal, ModalHeader, Input, ModalBody, ModalFooter, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';


const propTypes = {
  createDTable: PropTypes.func.isRequired,
  onAddDTable: PropTypes.func.isRequired,
  currentWorkspace: PropTypes.object,
};

class CreateTableDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tableName: '',
      errMessage: '',
      isSubmitBtnActive: false,
      selectedOption: null,
      options:[],
    };
    this.newInput = React.createRef();
  }

  componentDidMount() {
    this.newInput.focus();
    this.newInput.setSelectionRange(0,0);

    let options = [];
    seafileAPI.getAccountInfo().then((res) => {
      let obj = {};
      obj.value = 'Personal';
      obj.email = res.data.email;
      obj.label = 'Personal';
      options.push(obj);
      seafileAPI.listGroups().then((res) => {
        for (let i = 0 ; i < res.data.length; i++) {
          let obj = {};
          obj.value = res.data[i].name;
          obj.email = res.data[i].id + '@seafile_group';
          obj.label = res.data[i].name;
          options.push(obj);
        }
        this.setState({options: options});
      });
    });
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

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  }

  handleSubmit = () => {
    if (!this.state.isSubmitBtnActive) return;
    if (!this.validateInputParams()) return;
    const space = this.props.currentWorkspace;
    const options = this.state.options;
    let email;
    if (space) {
      for (let i = 0; i < options.length; i++) {
        if ((space.owner_type === "Personal" && options[i].value === 'Personal') || (space.owner_type === "Group" && options[i].value === space.owner_name)) {
          email = options[i].email;
          break;
        }
      }
    } else {
      email = this.state.selectedOption.email;
    }
    this.props.createDTable(this.state.tableName.trim(), email);
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  toggle = () => {
    this.props.onAddDTable();
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
    const { currentWorkspace } = this.props;
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
          {!currentWorkspace &&
            <Fragment>
              <Label>{gettext('Belong to')}</Label>
              <Select
                isClearable
                isMulti={false}
                maxMenuHeight={200}
                hideSelectedOptions={true}
                components={makeAnimated()}
                placeholder=''
                options={this.state.options}
                onChange={this.handleSelectChange}
              />
            </Fragment>
          }
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
