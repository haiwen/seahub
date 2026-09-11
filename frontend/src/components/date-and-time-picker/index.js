import React from 'react';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import PropTypes from 'prop-types';
import { translateCalendar } from '../../utils/date-format-utils';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';
import './index.css';

dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);


class Picker extends React.Component {

  constructor(props) {
    super(props);
    this.calendarContainerRef = React.createRef();
    this.inputRef = React.createRef();
    let now = dayjs();
    let lang = window.app.config.lang;
    const isZhcn = lang === 'zh-cn';
    if (isZhcn) {
      now = now.locale('zh-cn');
    } else {
      now = now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
  }

  getCalendarContainer = () => {
    return this.calendarContainerRef.current;
  };

  render() {
    let showHourAndMinute = true; // default: true
    if (this.props.showHourAndMinute != undefined) {
      showHourAndMinute = this.props.showHourAndMinute;
    }

    const format = showHourAndMinute ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';

    return (
      <DatePicker
        disabled={this.props.disabled}
        getCalendarContainer={this.getCalendarContainer}
        calendar={
          <Calendar
            className="sf-rc-calendar"
            defaultValue={this.defaultCalendarValue}
            disabledDate={this.props.disabledDate}
            format={format}
            locale={translateCalendar()}
            showHourAndMinute={showHourAndMinute}
          />
        }
        value={this.props.value}
        onChange={this.props.onChange}
      >
        {
          ({ value }) => {
            return (
              <div>
                <input
                  placeholder={format}
                  style={{ width: this.props.inputWidth || 250, height: this.props.inputHeight }}
                  tabIndex="-1"
                  disabled={this.props.disabled}
                  readOnly={true}
                  value={value && value.format(format) || ''}
                  className="form-control"
                  ref={this.inputRef}
                />
                <div ref={this.calendarContainerRef} />
              </div>
            );
          }
        }
      </DatePicker>
    );
  }
}

Picker.propTypes = {
  showHourAndMinute: PropTypes.bool.isRequired,
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  disabled: PropTypes.func,
  inputWidth: PropTypes.number.isRequired,
  inputHeight: PropTypes.number,
  onChange: PropTypes.func.isRequired
};

export default Picker;
