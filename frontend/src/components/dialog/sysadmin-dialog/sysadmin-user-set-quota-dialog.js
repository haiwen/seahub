
import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  onQuotaChanged: PropTypes.func.isRequired
};

class SysAdminUserSetQuotaDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      quota: '',
      isSubmitBtnActive: false,
      errorMsg: '',
    };
  }

  toggle = () => {
    this.props.toggle();
  }

  handleQuotaChange = (e) => {
    if (!e.target.value.trim()) {
      this.setState({isSubmitBtnActive: false});
    } else {
      this.setState({
        isSubmitBtnActive: true,
        errorMsg: ''
      });
    }
    this.setState({quota: e.target.value});
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
      e.preventDefault();
    }
  }

  handleSubmit = () => {
    let { quota } = this.state;
    if(Utils.isInteger(quota) && quota >= 0) {
      this.props.onQuotaChanged(quota);
    } else {
      this.setState({
        errorMsg: gettext('Invalid quota.')
      });
    }
  }

  render() {
    let { quota, isSubmitBtnActive, errorMsg } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Set quota')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="repoName">{gettext('Name')}</Label>
              <Input 
                id="repoName"
                onKeyPress={this.handleKeyPress} 
                value={quota}
                onChange={this.handleQuotaChange}
              />
            </FormGroup>
          </Form>
          <Alert color="light">{gettext('An integer that is greater than or equal to 0.')}{gettext('Tip: 0 means default limit')}</Alert>
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit} disabled={!isSubmitBtnActive}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminUserSetQuotaDialog.propTypes = propTypes;

export default SysAdminUserSetQuotaDialog;
