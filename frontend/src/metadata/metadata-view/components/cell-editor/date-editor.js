import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import { translateCalendar } from '@seafile/sf-metadata-ui-component/lib/calendar/utils';
import dayjs from '@seafile/sf-metadata-ui-component/lib/utils/dayjs';
import { getEventClassName, gettext } from '@seafile/sf-metadata-ui-component/lib/utils';
import { isFunction } from '../../_basic';

import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';
import '@seafile/sf-metadata-ui-component/lib/calendar/index.css';


let now = dayjs();

class SfCalendar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: null,
      open: true,
    };
    this.format = props.format || 'YYYY-MM-DD';
    this.calendarContainerRef = React.createRef();
    this.defaultCalendarValue = null;
    this.showHourAndMinute = this.format.indexOf('HH:mm') > -1;
    this.valueSubmitFormat = this.showHourAndMinute ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
  }

  componentDidMount() {
    const iszhcn = this.props.lang === 'zh-cn';
    if (iszhcn) {
      now = now.locale('zh-cn');
    } else {
      now = now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
    const { value } = this.props;
    if (value && dayjs(value).isValid()) {
      if (typeof value === 'string' && value.length === 1 && !isNaN(Number(value, 10))) {
        this.timer = setTimeout(() => {
          let inputDom = document.getElementsByClassName('rc-calendar-input')[0];
          if (inputDom) {
            inputDom.value = value;
          }
        }, 200);
        return;
      }
      let validValue = dayjs(value).isValid() ? dayjs(value) : dayjs(this.defaultCalendarValue);
      this.setState({ value: iszhcn ? dayjs(validValue).locale('zh-cn') : dayjs(validValue).locale('en-gb') });
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
    this.setState({ value }, () => {
      if (isFunction(this.props.onChange)) {
        this.props.onChange(value.format(this.valueSubmitFormat));
      }
    });
  };

  getValue = () => {
    const { value } = this.state;
    return value ? value.format(this.valueSubmitFormat) : null;
  };

  getInputNode = () => {
    const domNode = ReactDOM.findDOMNode(this);
    if (domNode.tagName === 'INPUT') {
      return domNode;
    }
    return domNode.querySelector('input:not([type=hidden])');
  };

  onOpenChange = (open) => {
    this.setState({ open });
  };

  onReadOnlyFocus = () => {
    this.setState({ open: true });
  };

  onBlur = (type) => {
    if (this.props.onBlur) this.props.onBlur(type);
  };

  closeEditor = () => {
    this.setState({ open: false });
    this.onBlur();
  };

  getCalendarContainer = () => {
    // this.calendarContainerRef.current
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
    if (!this.showHourAndMinute && className === 'rc-calendar-date') {
      this.timer = setTimeout(() => {
        this.closeEditor();
      }, 1);
    }
    if (this.showHourAndMinute && className === 'rc-calendar-date') {
      this.setState({ open: true });
    }
  };

  onClear = () => {
    if (isFunction(this.props.onClear)) {
      this.props.onClear();
      return;
    }
    this.setState({ value: null }, () => {
      this.setState({ open: true });
    });
  };

  onHotKey = (e) => {
    if (e.keyCode === 27) {
      e.stopPropagation();
      this.props.onClose();
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
    if (value) return dayjs(value).format('HH:mm');
    return '';
  };


  onClickRightPanelTime = () => {
    // we should change value and save it(async function), then close Editor.
    setTimeout(() => {
      this.closeEditor();
    }, 1);
  };

  render() {
    const { isReadOnly, lang } = this.props;
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
        style={{ zIndex: 1001 }}
        dateInputPlaceholder={gettext('Enter date')}
        format={calendarFormat}
        defaultValue={this.defaultCalendarValue}
        showDateInput={true}
        focusablePanel={false}
        showHourAndMinute={this.showHourAndMinute}
        onClear={this.onClear}
        onClickRightPanelTime={this.onClickRightPanelTime}
        defaultMinutesTime={defaultMinutesTime}
      />
    );
    return (
      <div className="date-picker-container" onKeyDown={(e) => this.handleKeyDown(e)} onClick={(e) => this.onClick(e)}>
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

SfCalendar.propTypes = {
  isReadOnly: PropTypes.bool,
  format: PropTypes.string,
  defaultFormat: PropTypes.string,
  lang: PropTypes.string,
  value: PropTypes.string,
  onCommit: PropTypes.func,
  onChange: PropTypes.func,
  onEscape: PropTypes.func,
  onClear: PropTypes.func,
  onClose: PropTypes.func,
  editorContainer: PropTypes.any,
  updateTabIndex: PropTypes.func,
  onBlur: PropTypes.func,
};

SfCalendar.defaultProps = {
  format: 'YYYY-MM-DD',
  lang: 'zh-cn',
  isReadOnly: false,
};

export default SfCalendar;
