import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
};

class SysAdminLibHistorySettingDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      keepDays: -1,
      expireDays: 30,
      disabled: true,
      allHistory: true,
      noHistory: false,
      autoHistory: false,
      errorInfo: ''
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetRepoHistorySetting(this.props.repoID).then(res => {
      this.setState({
        keepDays: res.data.keep_days,
        allHistory: res.data.keep_days < 0 ? true : false,
        noHistory: res.data.keep_days === 0 ? true : false,
        autoHistory: res.data.keep_days > 0 ? true : false,
        disabled: res.data.keep_days > 0 ? false : true,
        expireDays: res.data.keep_days > 0 ? res.data.keep_days : 30,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  submit = () => {
    let days = this.state.keepDays;
    if (this.state.autoHistory) {
      days = this.state.expireDays;
    }
    let repoID = this.props.repoID;
    // If it's allHistory, days is always -1, no validation is needed;
    // If it's noHistory, days is always 0, no validation is needed;
    // If it's autoHistory, days needs to be validated to be greater than 0."
    if (this.state.autoHistory && Number(days) <= 0) {
      this.setState({
        errorInfo: gettext('Please enter a non-negative integer'),
      });
      return;
    }

    let message = gettext('Successfully set library history.');
    systemAdminAPI.sysAdminUpdateRepoHistorySetting(repoID, parseInt(days)).then(res => {
      toaster.success(message);
      this.setState({ keepDays: res.data.keep_days });
      this.props.toggleDialog();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.submit();
      e.preventDefault();
    }
  };

  onChange = (e) => {
    let num = e.target.value;
    this.setState({
      keepDays: num,
      expireDays: num,
    });
  };

  setLimitDays = (type) => {
    if (type === 'allHistory') {
      this.setState({
        keepDays: -1,
      });
    } else if (type === 'noHistory') {
      this.setState({
        keepDays: 0,
      });
    } else {
      this.setState({
        disabled: false
      });
    }

    this.setState({
      allHistory: type === 'allHistory' ? true : false,
      noHistory: type === 'noHistory' ? true : false,
      autoHistory: type === 'autoHistory' ? true : false,
    });
  };

  render() {
    const { itemName: repoName } = this.props;
    let title = gettext('{placeholder} History Setting');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <SeahubModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody>
          <Form>
            <FormGroup check>
              <Input type="radio" name="radio1" checked={this.state.allHistory} onChange={() => {this.setLimitDays('allHistory');}}/>{' '}
              <Label>{gettext('Keep full history')}</Label>
            </FormGroup>
            <FormGroup check>
              <Input type="radio" name="radio1" checked={this.state.noHistory} onChange={() => {this.setLimitDays('noHistory');}}/>{' '}
              <Label>{gettext('Don\'t keep history')}</Label>
            </FormGroup>
            <FormGroup check>
              <Input type="radio" name="radio1" checked={this.state.autoHistory} onChange={() => {this.setLimitDays('autoHistory');}}/>{' '}
              <Label>{gettext('Only keep a period of history:')}</Label>
              <Input
                type="text"
                className="expire-input"
                value={this.state.expireDays}
                onChange={this.onChange}
                disabled={this.state.disabled}
                onKeyDown={this.handleKeyDown}
              />{' '}
              <Label><span>{gettext('days')}</span></Label>
            </FormGroup>
            {this.state.errorInfo && <Alert color="danger">{this.state.errorInfo}</Alert>}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminLibHistorySettingDialog.propTypes = propTypes;

export default SysAdminLibHistorySettingDialog;
