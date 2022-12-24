import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Form, FormGroup, Label } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  groupID: PropTypes.string,
  parentGroupID: PropTypes.string,
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
      if (this.props.parentGroupID) {
        parentGroup = this.props.parentGroupID;
      }
      seafileAPI.orgAdminAddDepartGroup(orgID, parentGroup, this.state.departName.trim()).then((res) => {
        this.props.toggle();
        this.props.onDepartChanged();
      }).catch(error => {
        let errorMsg = gettext(error.response.data.error_msg);
        this.setState({ errMessage: errorMsg });
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
    let header = this.props.parentGroupID ? gettext('New Sub-department') : gettext('New Department');
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
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
                autoFocus={true}
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
