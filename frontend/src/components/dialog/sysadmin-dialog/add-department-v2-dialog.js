import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, FormGroup, Input, Label, Modal, ModalBody, ModalFooter } from 'reactstrap';
import toaster from '../../toast';
import { gettext } from '../../../utils/constants';
import { Utils, validateName } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  parentNode: PropTypes.object,
  addDepartment: PropTypes.func,
  toggle: PropTypes.func,
  setRootNode: PropTypes.func
};

class AddDepartmentV2Dialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      departName: '',
      isSubmitBtnActive: false
    };
  }

  onKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  handleChange = (e) => {
    this.setState({
      departName: e.target.value
    }, () => {
      this.setState({ isSubmitBtnActive: !!this.state.departName.trim() });
    });
  };

  handleSubmit = () => {
    let response = validateName(this.state.departName.trim());
    if (!response.isValid) {
      this.setState({ errMessage: response.message });
      return;
    }
    const { orgID, parentNode } = this.props;
    const parentNodeId = parentNode ? parentNode.id : -1;
    const { departName } = this.state;
    const newDeptName = departName.trim();
    const req = orgID ? orgAdminAPI.orgAdminAddDepartGroup(orgID, parentNodeId, newDeptName) : systemAdminAPI.sysAdminAddNewDepartment(parentNodeId, newDeptName);

    req.then((res) => {
      if (parentNode) {
        this.props.addDepartment(parentNode, res.data);
      } else {
        this.props.setRootNode(res.data);
      }
      this.props.toggle();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { parentNode } = this.props;
    const { isSubmitBtnActive } = this.state;
    let title;
    if (parentNode) {
      title = gettext('Add department at') + ' ' + parentNode.name;
    } else {
      title = gettext('Create top department');
    }
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
        <SeahubModalHeader toggle={this.props.toggle}>{title}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="departmentName">{gettext('Name')}</Label>
              <Input
                id="departmentName"
                name="department-name"
                onKeyDown={this.onKeyDown}
                value={this.state.departName}
                onChange={this.handleChange}
                autoFocus
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddDepartmentV2Dialog.propTypes = propTypes;

export default AddDepartmentV2Dialog;
