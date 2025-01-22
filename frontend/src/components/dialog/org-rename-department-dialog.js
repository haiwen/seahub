import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Input, Form, FormGroup, Label } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  groupID: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  orgID: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  name: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  onDepartmentNameChanged: PropTypes.func.isRequired
};

class RenameDepartmentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      departmentName: this.props.name,
      errMessage: ''
    };
    this.newInput = React.createRef();
  }

  handleSubmit = () => {
    let isValid = this.validateName();
    const { orgID, groupID } = this.props;
    if (isValid) {
      orgAdminAPI.orgAdminUpdateDepartGroup(orgID, groupID, this.state.departmentName.trim()).then((res) => {
        this.props.toggle();
        this.props.onDepartmentNameChanged(res.data);
        toaster.success(gettext('Name updated'));
      }).catch(error => {
        let errorMsg = Utils.getErrorMsg(error);
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
      departmentName: e.target.value
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  onAfterModelOpened = () => {
    if (!this.newInput.current) return;
    this.newInput.current.focus();
    this.newInput.current.select();
  };

  render() {
    let header = gettext('Rename Department');
    return (
      <Modal isOpen={true} toggle={this.props.toggle} onOpened={this.onAfterModelOpened}>
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
                innerRef={this.newInput}
              />
            </FormGroup>
          </Form>
          {this.state.errMessage && <p className="error">{this.state.errMessage}</p>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

RenameDepartmentDialog.propTypes = propTypes;

export default RenameDepartmentDialog;
