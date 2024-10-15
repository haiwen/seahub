import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input, Alert } from 'reactstrap';
import dayjs from 'dayjs';
import { gettext, siteRoot, orgID } from '../../utils/constants';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { userAPI } from '../../utils/user-api';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';

class OrgLogsExportExcelDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      startDateStr: '',
      endDateStr: '',
      errMsg: '',
      taskId: '',
    };
  }

  downloadExcel = () => {
    if (!this.isValidDateStr()) {
      return;
    }
    switch (this.props.logType) {
      case 'fileaudit':
        this.orgAdminExportLogs('fileaudit');
        break;
      case 'file-update':
        this.orgAdminExportLogs('fileupdate');
        break;
      case 'perm-audit':
        this.orgAdminExportLogs('permaudit');
        break;
    }
  };

  orgAdminExportLogs = (logType) => {
    let { startDateStr, endDateStr } = this.state;
    let task_id = '';
    orgAdminAPI.orgAdminExportLogsExcel(orgID, startDateStr, endDateStr, logType).then(res => {
      task_id = res.data.task_id;
      this.setState({
        taskId: task_id
      });
      this.props.toggle();
      return userAPI.queryIOStatus(task_id);
    }).then(res => {
      if (res.data.is_finished === true) {
        location.href = siteRoot + 'api/v2.1/org/admin/log/export-excel/?task_id=' + task_id + '&log_type=' + logType;
      } else {
        this.timer = setInterval(() => {
          userAPI.queryIOStatus(task_id).then(res => {
            if (res.data.is_finished === true) {
              clearInterval(this.timer);
              location.href = siteRoot + 'api/v2.1/org/admin/log/export-excel/?task_id=' + task_id + '&log_type=' + logType;
            }
          }).catch(err => {
            clearInterval(this.timer);
            toaster.danger(gettext('Failed to export. Please check whether the size of table attachments exceeds the limit.'));
          });
        }, 1000);
      }
    }).catch(error => {
      this.props.toggle();
      if (error.response && error.response.status === 500) {
        const error_msg = error.response.data ? error.response.data['error_msg'] : null;
        if (error_msg && error_msg !== 'Internal Server Error') {
          toaster.danger(error_msg);
        } else {
          toaster.danger(gettext('Internal Server Error'));
        }
      } else {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    });
  };

  isValidDateStr = () => {
    let { startDateStr, endDateStr } = this.state;
    if (dayjs(startDateStr, 'YYYY-MM-DD', true).isValid() &&
      dayjs(endDateStr, 'YYYY-MM-DD', true).isValid() &&
      dayjs(startDateStr).isBefore(endDateStr)
    ) {
      return true;
    } else {
      this.setState({
        errMsg: gettext('Date Invalid.')
      });
      return false;
    }
  };

  handleStartChange = (e) => {
    const startDateStr = e.target.value.trim();
    this.setState({
      startDateStr: startDateStr,
      errMsg: ''
    });
  };

  handleEndChange = (e) => {
    const endDateStr = e.target.value.trim();
    this.setState({
      endDateStr: endDateStr,
      errMsg: '',
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
        <ModalHeader toggle={this.props.toggle}>{gettext('Choose date')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{gettext('Start date')}</Label>
            <Input
              value={this.state.startDateStr}
              onChange={this.handleStartChange}
              placeholder='yyyy-mm-dd'
              autoFocus={true}
            />
          </FormGroup>
          <FormGroup>
            <Label>{gettext('End date')}</Label>
            <Input
              value={this.state.endDateStr}
              onChange={this.handleEndChange}
              placeholder='yyyy-mm-dd'
            />
          </FormGroup>
          {this.state.errMsg &&
            <Alert className="mt-2" color="danger">
              {gettext(this.state.errMsg)}
            </Alert>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.downloadExcel}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

const propTypes = {
  toggle: PropTypes.func.isRequired,
  logType: PropTypes.string.isRequired,
};

OrgLogsExportExcelDialog.propTypes = propTypes;

export default OrgLogsExportExcelDialog;
