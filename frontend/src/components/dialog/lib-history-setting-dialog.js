import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext, enableRepoHistorySetting } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  itemName: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
};

class LibHistorySetting extends React.Component {

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
    seafileAPI.getRepoHistoryLimit(this.props.repoID).then(res => {
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
    let reg = /^-?\d+$/;
    let flag = reg.test(days);
    if (flag) {
      let message = gettext('Successfully set library history.');
      seafileAPI.setRepoHistoryLimit(repoID, days).then(res => {
        toaster.success(message);
        this.setState({keepDays: res.data.keep_days});
        this.props.toggleDialog();
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      this.setState({
        errorInfo: gettext('Please enter a non-negative integer'),
      });
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.submit();
      e.preventDefault();
    }
  }

  onChange = (e) => {
    let num = e.target.value;
    this.setState({
      keepDays: num,
      expireDays: num,
    });
  }

  setLimitDays = (type) => {
    if (type === 'allHistory') {
      this.setState({
        keepDays: -1,
        disabled: true
      });
    } else if (type === 'noHistory') {
      this.setState({
        keepDays: 0,
        disabled: true
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
  }

  render() {
    const itemName = this.props.itemName;
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggleDialog}>
          <span className="op-target" title={itemName}>{itemName}</span>{' '}
          {gettext('History Setting')}
        </ModalHeader>
        <ModalBody>
          <Form>
            {!enableRepoHistorySetting &&
              <FormGroup>
                <Label className="error">{gettext('Setting library history is disabled by Admin.')}</Label>
              </FormGroup>
            }
            <FormGroup check>
              <Input type="radio" name="radio1" checked={this.state.allHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.setLimitDays('allHistory');}}/>{' '}
              <Label>{gettext('Keep full history')}</Label>
            </FormGroup>
            <FormGroup check>
              <Input type="radio" name="radio1" checked={this.state.noHistory} disabled={!enableRepoHistorySetting} onChange={() =>{this.setLimitDays('noHistory');}}/>{' '}
              <Label>{gettext('Don\'t keep history')}</Label>
            </FormGroup>
            <FormGroup check>
              <Input type="radio" name="radio1" checked={this.state.autoHistory} disabled={!enableRepoHistorySetting} onChange={() =>{this.setLimitDays('autoHistory');}}/>{' '}
              <Label>{gettext('Only keep a period of history:')}</Label>
              <Input
                type="text"
                className="expire-input"
                value={this.state.expireDays}
                onChange={this.onChange}
                disabled={this.state.disabled}
                onKeyDown={this.handleKeyPress}
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

LibHistorySetting.propTypes = propTypes;

export default LibHistorySetting;
