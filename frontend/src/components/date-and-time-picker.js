import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import { translateCalendar } from '../utils/date-format-utils';

import '@seafile/seafile-calendar/assets/index.css';
import '../css/date-and-time-picker.css';

const propsTypes = {
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired
};

class Picker extends React.Component {

  constructor(props) {
    super(props);
    this.defaultCalendarValue = null;
    this.calendarContainerRef = React.createRef();
    this.inputRef = React.createRef();
  }

  componentDidMount() {
    let lang = window.app.config.lang;
    this.defaultCalendarValue = moment().locale(lang).clone();

  }

  getCalendarContainer = () => {
    return this.calendarContainerRef.current;
  }

  render() {
    const props = this.props;

    let showHourAndMinute = true; // default: true
    if (props.showHourAndMinute != undefined) {
      showHourAndMinute = props.showHourAndMinute;
    }

    const FORMAT = showHourAndMinute ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';

    const calendar = (<Calendar
      defaultValue={this.defaultCalendarValue}
      disabledDate={props.disabledDate}
      format={FORMAT}
      locale={translateCalendar()}
      showHourAndMinute={showHourAndMinute}
    />);
    return (
      <DatePicker
        disabled={props.disabled}
        getCalendarContainer={this.getCalendarContainer}
        calendar={calendar}
        value={props.value}
        onChange={props.onChange}
      >
        {
          ({value}) => {
            return (
              <div>
                <input
                  placeholder={FORMAT}
                  style={{ width: props.inputWidth || 250 }}
                  tabIndex="-1"
                  disabled={props.disabled}
                  readOnly={true}
                  value={value && value.format(FORMAT) || ''}
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

Picker.propsTypes = propsTypes;

export default Picker;
