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
      days: 30,
      daysInputDisabled: true,
      allHistory: true,
      noHistory: false,
      limitedHistory: false,
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
        limitedHistory: keepDays > 0,
        daysInputDisabled: keepDays <= 0,
        days: keepDays > 0 ? keepDays : 30,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  submit = (nextType) => {
    let days;
    if (nextType === 'allHistory') {
      days = -1;
    } else if (nextType === 'noHistory') {
      days = 0;
    } else if (nextType === 'limitedHistory' || this.state.limitedHistory) {
      days = this.state.days;
      // If it's limitedHistory, days needs to be validated to be greater than 0.
      if (Number(days) <= 0) {
        this.setState({
          errorInfo: gettext('Please enter a non-negative integer'),
        });
        return;
      }
    }

    const { repoID } = this.props;
    seafileAPI.setRepoHistoryLimit(repoID, parseInt(days)).then(res => {
      const message = gettext('Successfully set library history.');
      toaster.success(message);
      const { keep_days } = res.data;
      if (nextType === 'allHistory') {
        this.setState({
          keepDays: -1,
          daysInputDisabled: true,
          allHistory: true,
          noHistory: false,
          limitedHistory: false,
        });
      } else if (nextType === 'noHistory') {
        this.setState({
          keepDays: 0,
          daysInputDisabled: true,
          allHistory: false,
          noHistory: true,
          limitedHistory: false,
        });
      } else {
        this.setState({
          keepDays: keep_days,
          daysInputDisabled: false,
          allHistory: false,
          noHistory: false,
          limitedHistory: true,
        });
      }
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
      days: num,
    });
  };

  onHistorySelectionChanged = (type) => {
    this.submit(type);
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
            <Input type="radio" name="keep-history" checked={this.state.allHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.onHistorySelectionChanged('allHistory');}}/>{' '}
            <Label>{gettext('Keep full history')}</Label>
          </FormGroup>
          <FormGroup check>
            <Input type="radio" name="keep-history" checked={this.state.noHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.onHistorySelectionChanged('noHistory');}}/>{' '}
            <Label>{gettext('Don\'t keep history')}</Label>
          </FormGroup>
          <FormGroup check>
            <Input type="radio" name="keep-history" checked={this.state.limitedHistory} disabled={!enableRepoHistorySetting} onChange={() => {this.onHistorySelectionChanged('limitedHistory');}}/>{' '}
            <Label className='d-inline-flex'>
              {gettext('Only keep a period of history:')}
              <Input
                type="text"
                className="expire-input"
                value={this.state.days}
                onChange={this.onChange}
                disabled={this.state.daysInputDisabled}
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
