import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import { translateCalendar } from '../utils/date-format-utils';

import '@seafile/seafile-calendar/assets/index.css';

const propsTypes = {
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired
};

const FORMAT = 'YYYY-MM-DD HH:mm';

class Picker extends React.Component {

  constructor(props) {
    super(props);
    this.defaultCalendarValue = null;
    this.calendarContainerRef = React.createRef();
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
    const calendar = (<Calendar
      defaultValue={this.defaultCalendarValue}
      disabledDate={props.disabledDate}
      format={FORMAT}
      locale={translateCalendar()}
      showHourAndMinute={true}
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
              <div className="position-relative">
                <input 
                  placeholder={FORMAT}
                  style={{ width: props.inputWidth || 250 }}
                  tabIndex="-1"
                  disabled={props.disabled}
                  readOnly
                  value={value && value.format(FORMAT) || ''}
                  className="form-control"
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
