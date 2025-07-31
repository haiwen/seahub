import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, FormGroup, Label, Input, Alert } from 'reactstrap';
import dayjs from 'dayjs';
import { Utils } from '../../../utils/utils';
import { gettext, siteRoot } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { userAPI } from '../../../utils/user-api';
import toaster from '../../../components/toast';
import SeahubIODialog from '../../dialog/seahub-io-dialog';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

class LogsExportExcelDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      startDateStr: '',
      endDateStr: '',
      errMsg: '',
      taskId: '',
      isShowIODialog: false,
    };
  }

  downloadExcel = () => {
    if (!this.isValidDateStr()) {
      return;
    }
    switch (this.props.logType) {
      case 'loginLogs':
        this.sysExportLogs('loginadmin');
        break;
      case 'fileAccessLogs':
        this.sysExportLogs('fileaudit');
        break;
      case 'fileUpdateLogs':
        this.sysExportLogs('fileupdate');
        break;
      case 'sharePermissionLogs':
        this.sysExportLogs('permaudit');
        break;
    }
  };

  queryIOStatus = (task_id, logType) => {
    userAPI.queryIOStatus(task_id).then(res => {
      if (res.data.is_finished === true) {
        this.setState({
          isShowIODialog: false
        });
        this.props.toggle();
        location.href = siteRoot + 'sys/log/export-excel/?task_id=' + task_id + '&log_type=' + logType;

      } else {
        setTimeout(() => {
          this.queryIOStatus(task_id, logType);
        }, 1000);
      }
    }).catch(err => {
      this.setState({
        isShowIODialog: false
      });
      toaster.danger(gettext('Failed to export. Please check whether the size of table attachments exceeds the limit.'));
    });
  };

  sysExportLogs = (logType) => {
    let { startDateStr, endDateStr } = this.state;
    let task_id = '';
    this.setState({
      isShowIODialog: true
    }, () => {
      systemAdminAPI.sysAdminExportLogsExcel(startDateStr, endDateStr, logType).then(res => {
        task_id = res.data.task_id;
        this.setState({
          taskId: task_id,
        });
        return userAPI.queryIOStatus(task_id);
      }).then(res => {
        if (res.data.is_finished === true) {
          this.setState({
            isShowIODialog: false,
          });
          this.props.toggle();
          location.href = siteRoot + 'sys/log/export-excel/?task_id=' + task_id + '&log_type=' + logType;
        } else {
          this.queryIOStatus(task_id, logType);
        }
      }).catch(error => {
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
        this.setState({
          isShowIODialog: false
        });
        this.props.toggle();
      });
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

  onExportToggle = (e) => {
    this.setState({
      isShowIODialog: !this.state.isShowIODialog,
    });
    this.props.toggle();
  };

  render() {
    return (
      <React.Fragment>
        {!this.state.isShowIODialog &&
        <Modal isOpen={true} toggle={this.props.toggle} autoFocus={false}>
          <SeahubModalHeader toggle={this.props.toggle}>{gettext('Choose date')}</SeahubModalHeader>
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
        }
        {this.state.isShowIODialog &&
        <SeahubIODialog
          toggle={this.onExportToggle}
        />
        }
      </React.Fragment>
    );
  }
}

const propTypes = {
  toggle: PropTypes.func.isRequired,
  logType: PropTypes.string.isRequired,
};

LogsExportExcelDialog.propTypes = propTypes;

export default LogsExportExcelDialog;
