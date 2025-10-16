import React, { Component } from 'react';
import PropTypes from 'prop-types';
import localeData from 'dayjs/plugin/localeData';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import dayjs from '../../utils/dayjs';
import { translateCalendar } from '../../../utils/date-format-utils';
import { gettext } from '../../../utils/constants';
import { getEventClassName } from '../../../utils/dom';
import { Utils } from '../../../utils/utils';

import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';
import '../../../css/metadata-rc-calendar.css';

dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);

let now = dayjs();

class DateEditor extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: null,
    };
    const { format = 'YYYY-MM-DD', lang = 'zh-cn' } = props;
    this.format = format;
    this.calendarContainerRef = React.createRef();
    const isZhcn = lang === 'zh-cn';
    if (isZhcn) {
      now = now.locale('zh-cn');
    } else {
      now = now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
    this.timeFormat = this.format.split(' ')[1] || '';
    this.valueSubmitFormat = 'YYYY-MM-DD';
    if (this.timeFormat) {
      this.valueSubmitFormat = this.valueSubmitFormat + ' ' + this.timeFormat;
    }
  }

  componentDidMount() {
    const { lang = 'zh-cn', value } = this.props;
    const isZhcn = lang === 'zh-cn';
    if (value && dayjs(value).isValid()) {
      let validValue = dayjs(value).isValid() ? dayjs(value) : dayjs(this.defaultCalendarValue);
      this.setState({ value: isZhcn ? dayjs(validValue).locale('zh-cn') : dayjs(validValue).locale('en-gb') });
      if (typeof value === 'string' && value.length === 1 && !isNaN(Number(value, 10))) {
        this.timer = setTimeout(() => {
          let inputDom = document.getElementsByClassName('rc-calendar-input')[0];
          if (inputDom) {
            inputDom.value = value;
          }
        }, 200);
        return;
      }
    }
    document.addEventListener('keydown', this.onHotKey, true);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onHotKey, true);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  onChange = (value) => {
    if (!value) return;
    this.setState({ value });
    if (Utils.isFunction(this.props.onChange)) {
      this.props.onChange(value.format(this.valueSubmitFormat));
    }
  };

  getValue = () => {
    const { value } = this.state;
    return value ? value.format(this.valueSubmitFormat) : null;
  };

  getInputNode = () => {
    if (!this.datePickerRef) return null;
    if (this.datePickerRef.tagName === 'INPUT') {
      return this.datePickerRef;
    }
    return this.datePickerRef.querySelector('input:not([type=hidden])');
  };

  onBlur = (type) => {
    if (this.props.onBlur) this.props.onBlur(type);
  };

  closeEditor = () => {
    this.onBlur();
  };

  getCalendarContainer = () => {
    return document.body;
  };

  handleMouseDown = (e) => {
    e.preventDefault();
  };

  handleKeyDown = (e) => {
    const directionKeyCodes = [37, 38, 39, 40];
    if (directionKeyCodes.includes(e.keyCode)) {
      e.stopPropagation();
    } else if (e.keyCode === 13) {
      e.preventDefault();
      this.onBlur('enter');
    }
  };

  onClick = (event) => {
    event.stopPropagation();
    const className = getEventClassName(event);
    if (!this.timeFormat && className === 'rc-calendar-date') {
      this.timer = setTimeout(() => {
        this.closeEditor();
      }, 1);
    }
  };

  onClear = () => {
    if (Utils.isFunction(this.props.onClear)) {
      this.props.onClear();
      return;
    }
    this.setState({ value: null });
  };

  onHotKey = (e) => {
    if (e.keyCode === 27) {
      e.stopPropagation();
      this.props.onClose && this.props.onClose(true);
    }
  };

  getCalendarFormat = () => {
    if (this.format.indexOf('YYYY-MM-DD') > -1) {
      let newColumnDataFormat = this.format.replace('YYYY-MM-DD', 'YYYY-M-D');
      return [this.format, newColumnDataFormat];
    }
    if (this.format.indexOf('DD/MM/YYYY') > -1) {
      let newColumnDataFormat = this.format.replace('DD/MM/YYYY', 'D/M/YYYY');
      return [this.format, newColumnDataFormat];
    }
    return [this.format];
  };

  getDefaultMinutesTime = () => {
    const { value } = this.props;
    if (!this.timeFormat) return '';
    if (value) return dayjs(value).format('HH:mm');
    return '';
  };

  onClickRightPanelTime = () => {
    if (this.timeFormat.indexOf('ss') > 0) return;

    setTimeout(() => {
      this.closeEditor();
    }, 1);
  };

  render() {
    const { isReadOnly = false, lang = 'zh-cn' } = this.props;
    const state = this.state;
    if (isReadOnly) return (
      <input
        className="ant-calendar-picker-input ant-input form-control"
        value={state.value ? state.value.format(this.format) : ''}
        disabled={true}
      />
    );
    const calendarFormat = this.getCalendarFormat();
    const defaultMinutesTime = this.getDefaultMinutesTime();
    const calendar = (
      <Calendar
        className="sf-metadata-rc-calendar"
        locale={translateCalendar(lang)}
        style={{ zIndex: 1060 }}
        dateInputPlaceholder={gettext('Enter date')}
        format={calendarFormat}
        defaultValue={this.defaultCalendarValue}
        showDateInput={true}
        focusablePanel={false}
        showHourAndMinute={Boolean(this.timeFormat)}
        defaultMinutesTime={defaultMinutesTime}
        onClear={this.onClear}
        onClickRightPanelTime={this.onClickRightPanelTime}
      />
    );
    return (
      <div className="date-picker-container" ref={ref => this.datePickerRef = ref} onKeyDown={(e) => this.handleKeyDown(e)} onClick={(e) => this.onClick(e)}>
        <DatePicker
          calendar={calendar}
          value={state.value}
          onChange={this.onChange}
          getCalendarContainer={this.getCalendarContainer}
          onOpenChange={this.onOpenChange}
          open={true}
          style={{ zIndex: 1060 }}

        >
          {
            ({ value }) => {
              return (
                <span tabIndex="0">
                  <input
                    ref={ref => this.inputRef = ref}
                    placeholder={this.format ? this.format : gettext('Please select')}
                    tabIndex="-1"
                    readOnly
                    className="ant-calendar-picker-input ant-input form-control"
                    value={value ? value.format(this.format) : ''}
                    onMouseDown={this.handleMouseDown}
                  />
                  <div ref={this.calendarContainerRef} />
                </span>
              );
            }
          }
        </DatePicker>
      </div>
    );
  }
}

DateEditor.propTypes = {
  isReadOnly: PropTypes.bool,
  format: PropTypes.string,
  lang: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default DateEditor;
