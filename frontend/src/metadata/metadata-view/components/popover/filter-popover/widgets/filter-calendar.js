import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import { translateCalendar } from '../../../../utils/date-translate';
import { getDateColumnFormat } from '../../../../utils/column-utils';
import dayjs from '../../../../utils/dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';

let now = dayjs();

const propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  filterColumn: PropTypes.object.isRequired,
  isReadOnly: PropTypes.bool,
};

class FilterCalendar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      open: false,
      value: null
    };
    const DataFormat = getDateColumnFormat(props.filterColumn).trim();
    // Minutes and seconds are not supported at present
    this.columnDataFormat = DataFormat.split(' ')[0];
    this.calendarContainerRef = React.createRef();
    this.defaultCalendarValue = null;
  }

  componentDidMount() {
    const iszhcn = (window.app && window.app.config && window.app.config.lang === 'zh-cn');
    if (iszhcn) {
      now = now.locale('zh-cn');
    } else {
      now = now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
    const { value } = this.props;
    if (value && dayjs(value).isValid()) {
      let validValue = dayjs(value).isValid() ? dayjs(value) : dayjs(this.defaultCalendarValue);
      this.setState({
        value: iszhcn ? dayjs(validValue).locale('zh-cn') : dayjs(validValue).locale('en-gb')
      });
    }
  }

  handleMouseDown = (e) => {
    e.preventDefault();
  };

  onChange = (value) => {
    const { onChange } = this.props;
    const searchFormat = 'YYYY-MM-DD';
    this.setState({
      value
    }, () => {
      if (this.state.value) {
        onChange(this.state.value.format(searchFormat));
      }
    });
  };

  onClear = () => {
    this.setState({
      value: null
    }, () => {
      this.setState({
        open: true
      });
    });
  };

  onOpenChange = (open) => {
    this.setState({
      open,
    });
  };

  onReadOnlyFocus = () => {
    if (!this.state.open && this.state.isMouseDown) {
      this.setState({
        isMouseDown: false,
      });
    } else {
      this.setState({
        open: true,
      });
    }
  };

  getCalendarContainer = () => {
    return this.calendarContainerRef.current;
  };

  getCalendarFormat = () => {
    let calendarFormat = [];
    if (this.columnDataFormat.indexOf('YYYY-MM-DD') > -1) {
      let newColumnDataFormat = this.columnDataFormat.replace('YYYY-MM-DD', 'YYYY-M-D');
      calendarFormat = [this.columnDataFormat, newColumnDataFormat];
    } else if (this.columnDataFormat.indexOf('DD/MM/YYYY') > -1) {
      let newColumnDataFormat = this.columnDataFormat.replace('DD/MM/YYYY', 'D/M/YYYY');
      calendarFormat = [this.columnDataFormat, newColumnDataFormat];
    } else {
      calendarFormat = [this.columnDataFormat];
    }
    return calendarFormat;
  };

  render() {
    const { isReadOnly } = this.props;
    const state = this.state;
    if (isReadOnly) return (
      <input
        className="ant-calendar-picker-input ant-input form-control"
        value={state.value ? state.value.format(this.columnDataFormat) : ''}
        disabled={true}
      />
    );
    const calendarFormat = this.getCalendarFormat();
    const clearStyle = {
      position: 'absolute',
      top: '15px',
      left: '225px',
      color: 'gray',
      fontSize: '12px'
    };
    const clearIcon = React.createElement('i', { className: 'item-icon sf-metadata-font sf-metadata-icon-x', style: clearStyle });
    const calendar = (
      <Calendar
        className="sf-metadata-rc-calendar"
        locale={translateCalendar()}
        style={{ zIndex: 1001 }}
        dateInputPlaceholder={('please enter date')}
        format={calendarFormat}
        defaultValue={this.defaultCalendarValue}
        showDateInput={true}
        focusablePanel={false}
        onClear={this.onClear}
        clearIcon={clearIcon}
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
          style={{ zIndex: 1001 }}
        >
          {
            ({ value }) => {
              return (
                <span tabIndex="0" onFocus={this.onReadOnlyFocus}>
                  <input
                    tabIndex="-1"
                    readOnly
                    className="ant-calendar-picker-input ant-input form-control"
                    value={value ? value.format(this.columnDataFormat) : ''}
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

FilterCalendar.propTypes = propTypes;

export default FilterCalendar;
