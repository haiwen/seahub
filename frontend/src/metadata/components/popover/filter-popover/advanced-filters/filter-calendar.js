import React, { Component } from 'react';
import PropTypes from 'prop-types';
import localeData from 'dayjs/plugin/localeData';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import dayjs from '../../../../utils/dayjs';
import { gettext, lang } from '../../../../../utils/constants';
import { getDateColumnFormat } from '../../../../utils/column';
import { translateCalendar } from '../../../../../utils/date-format-utils';

import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';
import '../../../../../css/metadata-rc-calendar.css';

dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);

let now = dayjs();

class FilterCalendar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      open: false,
      value: null
    };

    // Minutes and seconds are not supported at present
    const columnFormat = getDateColumnFormat(props.filterColumn).trim();
    this.format = columnFormat.split(' ')[0];
    this.calendarContainerRef = React.createRef();
    const isZhcn = lang === 'zh-cn';
    if (isZhcn) {
      now = now.locale('zh-cn');
    } else {
      now = now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
  }

  componentDidMount() {
    const { value } = this.props;
    if (value && dayjs(value).isValid()) {
      let validValue = dayjs(value).isValid() ? dayjs(value) : dayjs(this.defaultCalendarValue);
      this.setState({
        value: lang === 'zh-cn' ? dayjs(validValue).locale('zh-cn') : dayjs(validValue).locale('en-gb')
      });
    }
  }

  handleMouseDown = (e) => {
    e.preventDefault();
  };

  onChange = (value) => {
    const { onChange } = this.props;
    const searchFormat = 'YYYY-MM-DD';
    this.setState({ value }, () => {
      if (this.state.value) {
        onChange(this.state.value.format(searchFormat));
      }
    });
  };

  onClear = () => {
    this.setState({ value: null }, () => {
      this.setState({ open: true });
    });
  };

  onOpenChange = (open) => {
    this.setState({ open });
  };

  onReadOnlyFocus = () => {
    if (!this.state.open && this.state.isMouseDown) {
      this.setState({ isMouseDown: false });
    } else {
      this.setState({ open: true });
    }
  };

  getCalendarContainer = () => {
    return this.calendarContainerRef.current;
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

  render() {
    const { isReadOnly = false, zIndex = 1061 } = this.props;
    const state = this.state;
    if (isReadOnly) return (
      <input
        className="ant-calendar-picker-input ant-input form-control"
        value={state.value ? state.value.format(this.format) : ''}
        disabled={true}
      />
    );
    const calendarFormat = this.getCalendarFormat();
    const calendar = (
      <Calendar
        className="sf-metadata-rc-calendar"
        locale={translateCalendar(lang)}
        style={{ zIndex: zIndex || 1001 }}
        dateInputPlaceholder={gettext('Enter date')}
        format={calendarFormat}
        defaultValue={this.defaultCalendarValue}
        showDateInput={true}
        focusablePanel={false}
        onClear={this.onClear}
      />
    );
    return (
      <div className="date-picker-container">
        <DatePicker
          calendar={calendar}
          value={state.value}
          onChange={this.onChange}
          getCalendarContainer={this.getCalendarContainer}
          onOpenChange={this.onOpenChange}
          open={state.open}
          style={{ zIndex: zIndex || 1001 }}
        >
          {
            ({ value }) => {
              return (
                <span tabIndex="0" onFocus={this.onReadOnlyFocus}>
                  <input
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

FilterCalendar.propTypes = {
  isReadOnly: PropTypes.bool,
  zIndex: PropTypes.number,
  filterColumn: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FilterCalendar;
