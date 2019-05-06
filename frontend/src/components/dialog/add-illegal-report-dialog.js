import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, FormGroup, Label, Input, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';

const propTypes = {
  sharedToken: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleAddIllegalReportDialog: PropTypes.func.isRequired,
  isAddIllegalReportDialogOpen: PropTypes.bool.isRequired,
};

class AddIllegalReportDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      illegalType: 'copyright',
      description: '',
      reporter: '',
      errMessage: '',
    };
  }

  onIllegalReport = () => {
    seafileAPI.addIllegalReport(this.props.sharedToken, this.state.illegalType, this.state.description, this.state.reporter, this.props.filePath).then((res) => {
      this.props.toggleAddIllegalReportDialog();
      toaster.success(gettext('Success'), {duration: 2});
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errMessage: error.response.data.error_msg
        });
      }
    });
  };

  onIllegalTypeChange = (event) => {
    let type = event.target.value;
    if (type == 'copyright') {
      this.state.illegalType = 'copyright';
    } else if (type == 'virus') {
      this.state.illegalType = 'virus';
    } else if (type == 'illegal_content') {
      this.state.illegalType = 'illegal_content';
    } else if (type == 'other') {
      this.state.illegalType = 'other';
    }
  };

  setReporter = (event) => {
    let reporter = event.target.value;
    this.state.reporter = reporter;
  };

  setDescription = (event) => {
    let desc = event.target.value;
    this.state.description = desc;
  };

  render() {
    return (
      <Modal isOpen={this.props.isAddIllegalReportDialogOpen} toggle={this.props.toggleAddIllegalReportDialog}>
        <ModalHeader toggle={this.props.toggleAddIllegalReportDialog}>{gettext('Report')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="illegal-type-select">{gettext('Illegal Type')}</Label>
              <Input type="select" id="illegal-type-select" onChange={(event) => this.onIllegalTypeChange(event)}>
                <option value='copyright'>{gettext('Copyright infringement')}</option>
                <option value='virus'>{gettext('Virus')}</option>
                <option value='illegal_content'>{gettext('Illegal content')}</option>
                <option value='other'>{gettext('Other')}</option>
              </Input>
            </FormGroup>
            <FormGroup>
              <Label>{gettext("Contact Information")}</Label>
              <Input type="text" onChange={(event) => this.setReporter(event)}/>
            </FormGroup>
            <FormGroup>
              <Label>{gettext("Description")}</Label>
              <Input type="textarea" onChange={(event) => this.setDescription(event)}/>
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleAddIllegalReportDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.onIllegalReport}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddIllegalReportDialog.propTypes = propTypes;

export default AddIllegalReportDialog;
