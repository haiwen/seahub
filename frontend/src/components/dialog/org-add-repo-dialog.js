import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Input, Form, FormGroup, Label, Alert } from 'reactstrap';
import { gettext, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { Utils } from '../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  groupID: PropTypes.string,
  onAddNewRepo: PropTypes.func.isRequired,
};

class AddRepoDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoName: '',
      errMessage: '',
    };
  }

  handleSubmit = () => {
    let isValid = this.validateName();
    if (isValid) {
      orgAdminAPI.orgAdminAddDepartmentRepo(orgID, this.props.groupID, this.state.repoName.trim()).then((res) => {
        this.props.toggle();
        this.props.onAddNewRepo(res.data);
      }).catch(error => {
        let errorMsg = Utils.getErrorMsg(error);
        this.setState({ errMessage: errorMsg });
      });
    }
  };

  validateName = () => {
    let errMessage = '';
    const name = this.state.repoName.trim();
    if (!name.length) {
      errMessage = gettext('Name is required');
      this.setState({ errMessage: errMessage });
      return false;
    }
    return true;
  };

  handleChange = (e) => {
    this.setState({
      repoName: e.target.value,
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  };

  render() {
    const { errMessage } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
        <SeahubModalHeader toggle={this.props.toggle}>{gettext('New Library')}</SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input
                id="repoName"
                name="repo-name"
                onKeyDown={this.handleKeyDown}
                value={this.state.repoName}
                onChange={this.handleChange}
                autoFocus={true}
              />
            </FormGroup>
          </Form>
          {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddRepoDialog.propTypes = propTypes;

export default AddRepoDialog;
