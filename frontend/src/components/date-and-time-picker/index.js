import React from 'react';
import Calendar from '@seafile/seafile-calendar';
import MonthCalendar from '@seafile/seafile-calendar/lib/MonthCalendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import PropTypes from 'prop-types';
import ClearIcon from '@/components/clear-icon';
import { translateCalendar } from '@/utils/date-format-utils';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';

dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);


class Picker extends React.Component {

  constructor(props) {
    super(props);
    this.state = { isOpen: false };
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

  onOpenChange = (isOpen) => {
    if (isOpen && this.props.disabled) return;
    const restoreFocus = !isOpen && this.calendarContainerRef.current?.contains(document.activeElement);
    this.setState({ isOpen }, () => {
      if (restoreFocus) this.inputRef.current?.focus();
    });
  };

  onKeyDownCapture = (event) => {
    // The calendar does not forward Escape from its date input or month panel.
    this.isClosingWithEscape = false;
    if (this.state.isOpen && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.isClosingWithEscape = true;
      this.onOpenChange(false);
    }
  };

  onKeyUpCapture = (event) => {
    // Reactstrap modals handle Escape on keyup, after focus returns to the input.
    if (this.isClosingWithEscape && event.key === 'Escape') {
      event.stopPropagation();
      this.isClosingWithEscape = false;
    }
  };

  render() {
    let showHourAndMinute = true; // default: true
    if (this.props.showHourAndMinute != undefined) {
      showHourAndMinute = this.props.showHourAndMinute;
    }

    const isMonthPicker = this.props.mode === 'month';
    const format = isMonthPicker ? 'YYYY-MM' : showHourAndMinute ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
    const CalendarComponent = isMonthPicker ? MonthCalendar : Calendar;

    return (
      <div onKeyDownCapture={this.onKeyDownCapture} onKeyUpCapture={this.onKeyUpCapture}>
        <DatePicker
          disabled={this.props.disabled}
          open={this.state.isOpen}
          onOpenChange={this.onOpenChange}
          getCalendarContainer={this.getCalendarContainer}
          calendar={
            <CalendarComponent
              className="sf-rc-calendar"
              defaultValue={this.defaultCalendarValue}
              disabledDate={this.props.disabledDate}
              format={format}
              locale={translateCalendar()}
              showHourAndMinute={showHourAndMinute}
              clearIcon={<ClearIcon />}
            />
          }
          value={this.props.value}
          onChange={this.props.onChange}
        >
          {
            ({ value }) => {
              return (
                <input
                  placeholder={format}
                  style={{ width: this.props.inputWidth || 250, height: this.props.inputHeight }}
                  tabIndex={this.props.tabIndex}
                  disabled={this.props.disabled}
                  readOnly={true}
                  value={value && value.format(format) || ''}
                  className="form-control"
                  ref={this.inputRef}
                />
              );
            }
          }
        </DatePicker>
        <div ref={this.calendarContainerRef} />
      </div>
    );
  }
}

Picker.propTypes = {
  showHourAndMinute: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['date', 'month']),
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  disabled: PropTypes.func,
  inputWidth: PropTypes.number.isRequired,
  inputHeight: PropTypes.number,
  tabIndex: PropTypes.number,
  onChange: PropTypes.func.isRequired
};

Picker.defaultProps = {
  mode: 'date',
  tabIndex: -1,
};

export default Picker;
