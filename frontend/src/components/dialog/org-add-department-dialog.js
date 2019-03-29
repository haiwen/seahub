import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Form, FormGroup, Label } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onDepartChanged: PropTypes.func.isRequired,
};

class AddDepartDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      departName: '',
      errMessage: '',
    };
  }

  handleSubmit = () => {
    let isValid = this.validateName();
    if (isValid) {
      let parentGroup = -1;
      if (this.props.activeGroup) {
        parentGroup = this.props.activeGroup.id;
      }
      seafileAPI.orgAdminAddDepartGroup(orgID, parentGroup, this.state.departName.trim()).then((res) => {
        this.props.toggle();
        this.props.onDepartChanged();
      });
    }
  }

  validateName = () => {
    let errMessage = '';
    const name = this.state.departName.trim();
    if (!name.length) {
      errMessage = gettext('Name is required');
      this.setState({ errMessage: errMessage });
      return false;
    }
    const myReg = /[`~!@#$%^&*()\+=<>?:"{}|,.\/;'\\[\]·~！@#￥%……&*（）——\{}|《》？：“”【】、；‘’，。、]/im;
    if (myReg.test(name)) {
      errMessage = gettext('Name can only contain letters, numbers, blank, hyphen or underscore.');
      this.setState({ errMessage: errMessage });
      return false;
    }
    return true;
  }

  handleChange = (e) => {
    this.setState({
      departName: e.target.value, 
    });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  render() {
    let header = this.props.activeGroup ? gettext('New Sub-department') : gettext('New Department');
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>{header}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="departName">{gettext('Name')}</Label>
              <Input 
                id="departName" 
                onKeyPress={this.handleKeyPress} 
                value={this.state.departName} 
                onChange={this.handleChange}
              />
            </FormGroup>
          </Form>
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddDepartDialog.propTypes = propTypes;

export default AddDepartDialog;
