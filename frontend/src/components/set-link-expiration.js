import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormGroup, Label, Input, InputGroup, InputGroupAddon, InputGroupText, FormText } from 'reactstrap';
import { gettext } from '../utils/constants';
import { Utils } from '../utils/utils';
import DateTimePicker from './date-and-time-picker';

const propTypes = {
  minDays: PropTypes.number.isRequired,
  maxDays: PropTypes.number.isRequired,
  defaultDays: PropTypes.number.isRequired,
  expType: PropTypes.string.isRequired,
  setExpType: PropTypes.func.isRequired,
  expireDays: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  onExpireDaysChanged: PropTypes.func.isRequired,
  expDate: PropTypes.object,
  onExpDateChanged: PropTypes.func.isRequired
};

const inputWidth = Utils.isDesktop() ? 250 : 210;

class SetLinkExpiration extends React.Component {

  constructor(props) {
    super(props);

    const { minDays, maxDays, defaultDays } = this.props;
    this.isExpireDaysNoLimit = (minDays === 0 && maxDays === 0 && defaultDays == 0);

    let expirationLimitTip = '';
    if (minDays !== 0 && maxDays !== 0) {
      expirationLimitTip = gettext('{minDays_placeholder} - {maxDays_placeholder} days')
        .replace('{minDays_placeholder}', minDays)
        .replace('{maxDays_placeholder}', maxDays);
    } else if (minDays !== 0 && maxDays === 0) {
      expirationLimitTip = gettext('Greater than or equal to {minDays_placeholder} days')
        .replace('{minDays_placeholder}', minDays);
    } else if (minDays === 0 && maxDays !== 0) {
      expirationLimitTip = gettext('Less than or equal to {maxDays_placeholder} days')
        .replace('{maxDays_placeholder}', maxDays);
    }
    this.expirationLimitTip = expirationLimitTip;
  }

  disabledDate = (current) => {
    if (!current) {
      // allow empty select
      return false;
    }

    if (this.isExpireDaysNoLimit) {
      return current.isBefore(moment(), 'day');
    }

    const { minDays, maxDays } = this.props;
    const startDay = moment().add(minDays, 'days');
    const endDay = moment().add(maxDays, 'days');
    if (minDays !== 0 && maxDays !== 0) {
      return current.isBefore(startDay, 'day') || current.isAfter(endDay, 'day');
    } else if (minDays !== 0 && maxDays === 0) {
      return current.isBefore(startDay, 'day');
    } else if (minDays === 0 && maxDays !== 0) {
      return current.isBefore(moment(), 'day') || current.isAfter(endDay, 'day');
    }
  }

  render() {
    const {
      expType, setExpType,
      expireDays, onExpireDaysChanged,
      expDate, onExpDateChanged
    } = this.props;
    return (
      <Fragment>
        <FormGroup check>
          <Label check>
            <Input type="radio" name="set-exp" value="by-days" checked={expType == 'by-days'} onChange={setExpType} className="mr-1" />
            <span>{gettext('Expiration days')}</span>
          </Label>
          {expType == 'by-days' && (
            <Fragment>
              <InputGroup style={{width: inputWidth}}>
                <Input type="text" value={expireDays} onChange={onExpireDaysChanged} />
                <InputGroupAddon addonType="append">
                  <InputGroupText>{gettext('days')}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {!this.isExpireDaysNoLimit && (
                <FormText color="muted">{this.expirationLimitTip}</FormText>
              )}
            </Fragment>
          )}
        </FormGroup>
        <FormGroup check>
          <Label check>
            <Input type="radio" name="set-exp" value="by-date" checked={expType == 'by-date'} onChange={setExpType} className="mr-1" />
            <span>{gettext('Expiration time')}</span>
          </Label>
          {expType == 'by-date' && (
            <DateTimePicker
              inputWidth={inputWidth}
              disabledDate={this.disabledDate}
              value={expDate}
              onChange={onExpDateChanged}
            />
          )}
        </FormGroup>
      </Fragment>
    );
  }
}

SetLinkExpiration.propTypes = propTypes;

export default SetLinkExpiration;
