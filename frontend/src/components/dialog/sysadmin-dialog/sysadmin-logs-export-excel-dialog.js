import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext, siteRoot } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import toaster from '../../../components/toast';
import moment from 'moment';

class LogsExportExcelDialog extends React.Component {

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
      case 'login':
        // url += 'sys/loginadmin/export-excel/';
        this.sysExportLogs('loginadmin');
        break;
      case 'fileAccess':
        // url += 'sys/log/fileaudit/export-excel/';
        this.sysExportLogs('fileaudit');
        break;
      case 'fileUpdate':
        // url += 'sys/log/fileupdate/export-excel/';
        this.sysExportLogs('fileupdate');
        break;
      case 'sharePermission':
        // url += 'sys/log/permaudit/export-excel/';
        this.sysExportLogs('permaudit');
        break;
    }
  };

  sysExportLogs = (logType) =>{
    let { startDateStr, endDateStr } = this.state;
    let task_id = '';
    systemAdminAPI.sysAdminExportLogsExcel(startDateStr, endDateStr, logType).then(res => {
      task_id = res.data.task_id;
      this.setState({
        taskId: task_id
      });
      this.props.toggle();
      return systemAdminAPI.queryAsyncOperationExportExcel(task_id);
    }).then(res => {
      if (res.data.is_finished === true){
        location.href = siteRoot + 'sys/log/export-excel/?task_id=' + task_id + '&log_type=' + logType;
      } else {
        this.timer = setInterval(() => {
          systemAdminAPI.queryAsyncOperationExportExcel(task_id).then(res => {
            if (res.data.is_finished === true){
              this.setState({isFinished: true});
              clearInterval(this.timer);
              location.href = siteRoot + 'sys/log/export-excel/?task_id=' + task_id + '&log_type=' + logType;
            }
          }).catch(err => {
            if (this.state.isFinished === false){
              clearInterval(this.timer);
              toaster.danger(gettext('Failed to export. Please check whether the size of table attachments exceeds the limit.'));
            }
          });
        }, 1000);
      }
    });
  };

  isValidDateStr = () => {
    let { startDateStr, endDateStr } = this.state;
    if (moment(startDateStr, 'YYYY-MM-DD', true).isValid() &&
      moment(endDateStr, 'YYYY-MM-DD', true).isValid() &&
      moment(startDateStr).isBefore(endDateStr)
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

LogsExportExcelDialog.propTypes = propTypes;

export default LogsExportExcelDialog;
