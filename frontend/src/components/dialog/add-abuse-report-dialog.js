import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, FormGroup, Label, Input, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';

const propTypes = {
  sharedToken: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleAddAbuseReportDialog: PropTypes.func.isRequired,
  isAddAbuseReportDialogOpen: PropTypes.bool.isRequired,
  contactEmail: PropTypes.string.isRequired,
};

class AddAbuseReportDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      abuseType: 'copyright',
      description: '',
      reporter: this.props.contactEmail,
      errMessage: '',
    };
  }

  onAbuseReport = () => {
    if (!this.state.reporter) {
      this.setState({
        errMessage: gettext('Contact information is required.')
      });
      return;
    }
    seafileAPI.addAbuseReport(this.props.sharedToken, this.state.abuseType, this.state.description, this.state.reporter, this.props.filePath).then((res) => {
      this.props.toggleAddAbuseReportDialog();
      toaster.success(gettext('Success'), {duration: 2});
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errMessage: error.response.data.error_msg
        });
      }
    });
  };

  onAbuseTypeChange = (event) => {
    let type = event.target.value;
    if (type === this.state.abuseType) {
      return;
    }
    this.setState({abuseType: type});
  };

  setReporter = (event) => {
    let reporter = event.target.value.trim();
    this.setState({reporter: reporter});
  };

  setDescription = (event) => {
    let desc = event.target.value.trim();
    this.setState({description: desc});
  };

  render() {
    return (
      <Modal isOpen={this.props.isAddAbuseReportDialogOpen} toggle={this.props.toggleAddAbuseReportDialog}>
        <ModalHeader toggle={this.props.toggleAddAbuseReportDialog}>{gettext('Report Abuse')}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="abuse-type-select">{gettext('Abuse Type')}</Label>
              <Input type="select" id="abuse-type-select" onChange={(event) => this.onAbuseTypeChange(event)}>
                <option value='copyright'>{gettext('Copyright Infringement')}</option>
                <option value='virus'>{gettext('Virus')}</option>
                <option value='abuse_content'>{gettext('Abuse Content')}</option>
                <option value='other'>{gettext('Other')}</option>
              </Input>
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Contact Information')}</Label>
              <Input type="text" value={this.state.reporter} onChange={(event) => this.setReporter(event)}/>
            </FormGroup>
            <FormGroup>
              <Label>{gettext('Description')}</Label>
              <Input type="textarea" onChange={(event) => this.setDescription(event)}/>
            </FormGroup>
          </Form>
          {this.state.errMessage && <Alert color="danger">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleAddAbuseReportDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.onAbuseReport}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

AddAbuseReportDialog.propTypes = propTypes;

export default AddAbuseReportDialog;
