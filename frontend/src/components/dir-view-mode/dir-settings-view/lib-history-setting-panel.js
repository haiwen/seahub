import React from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext, enableRepoHistorySetting } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired
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
      const { keep_days: keepDays } = res.data;
      this.setState({
        keepDays,
        allHistory: keepDays < 0,
        noHistory: keepDays === 0,
        autoHistory: keepDays > 0,
        disabled: keepDays <= 0,
        expireDays: keepDays > 0 ? keepDays : 30,
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

    seafileAPI.setRepoHistoryLimit(repoID, parseInt(days)).then(res => {
      this.setState({ keepDays: res.data.keep_days });
      const message = gettext('Successfully set library history.');
      toaster.success(message);
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
      allHistory: type === 'allHistory',
      noHistory: type === 'noHistory',
      autoHistory: type === 'autoHistory',
    });

    this.submit();
  };

  render() {
    return (
      <div className='library-setting-item'>
        <h3 className='library-setting-item-heading'>{gettext('History')}</h3>
        <Form>
          {!enableRepoHistorySetting &&
          <p className="tip">{gettext('Setting library history is disabled by Admin.')}</p>
          }
          <FormGroup check>
            <Input type="radio" name="radio1" checked={this.state.allHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.setLimitDays('allHistory');}}/>{' '}
            <Label>{gettext('Keep full history')}</Label>
          </FormGroup>
          <FormGroup check>
            <Input type="radio" name="radio1" checked={this.state.noHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.setLimitDays('noHistory');}}/>{' '}
            <Label>{gettext('Don\'t keep history')}</Label>
          </FormGroup>
          <FormGroup check>
            <Input type="radio" name="radio1" checked={this.state.autoHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.setLimitDays('autoHistory');}}/>{' '}
            <Label className='d-inline-flex'>
              {gettext('Only keep a period of history:')}
              <Input
                type="text"
                className="expire-input"
                value={this.state.expireDays}
                onChange={this.onChange}
                disabled={this.state.disabled}
                onKeyDown={this.handleKeyDown}
              />
              <span>{gettext('days')}</span>
            </Label>
          </FormGroup>
          {this.state.errorInfo && <Alert color="danger">{this.state.errorInfo}</Alert>}
        </Form>
      </div>
    );
  }
}

LibHistorySetting.propTypes = propTypes;

export default LibHistorySetting;
