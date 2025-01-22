import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Input, Form, FormGroup, Label } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  groupID: PropTypes.string,
  parentGroupID: PropTypes.string,
  toggle: PropTypes.func.isRequired,
  onAddNewDepartment: PropTypes.func.isRequired,
};

class AddDepartmentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      departmentName: '',
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
      orgAdminAPI.orgAdminAddDepartGroup(orgID, parentGroup, this.state.departmentName.trim()).then((res) => {
        this.props.toggle();
        this.props.onAddNewDepartment(res.data);
      }).catch(error => {
        let errorMsg = gettext(error.response.data.error_msg);
        this.setState({ errMessage: errorMsg });
      });
    }
  };

  validateName = () => {
    let errMessage = '';
    const name = this.state.departmentName.trim();
    if (!name.length) {
      errMessage = gettext('Name is required');
      this.setState({ errMessage: errMessage });
      return false;
    }
    return true;
  };

  handleChange = (e) => {
    this.setState({
      departmentName: e.target.value,
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  render() {
    let header = this.props.parentGroupID ? gettext('New Sub-department') : gettext('New Department');
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
        <SeahubModalHeader toggle={this.props.toggle}>{header}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="departmentName">{gettext('Name')}</Label>
              <Input
                id="departmentName"
                name="department-name"
                onKeyDown={this.handleKeyDown}
                value={this.state.departmentName}
                onChange={this.handleChange}
                autoFocus={true}
              />
            </FormGroup>
          </Form>
          { this.state.errMessage && <p className="error">{this.state.errMessage}</p> }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddDepartmentDialog.propTypes = propTypes;

export default AddDepartmentDialog;
