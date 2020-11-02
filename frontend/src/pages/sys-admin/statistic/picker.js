import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import { translateCalendar } from '../../../utils/date-format-utils';

import '@seafile/seafile-calendar/assets/index.css';

const propsTypes = {
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

const FORMAT = 'YYYY-MM-DD';

class Picker extends React.Component {

  constructor(props) {
    super(props);
    this.defaultCalendarValue = null;
  }

  componentDidMount() {
    let lang = window.app.config.lang;
    this.defaultCalendarValue = moment().locale(lang).clone();
  }

  render() {
    const props = this.props;
    const calendar = (<Calendar
      defaultValue={this.defaultCalendarValue}
      disabledDate={props.disabledDate}
      format={FORMAT}
      locale={translateCalendar()}
    />);
    return (
      <DatePicker
        calendar={calendar}
        value={props.value}
        onChange={props.onChange}
      >
        {
          ({value}) => {
            return (
              <span>
                <input
                  placeholder="yyyy-mm-dd"
                  tabIndex="-1"
                  readOnly
                  value={value && value.format(FORMAT) || ''}
                  className="form-control system-statistic-input"
                />
              </span>
            );
          }
        }
      </DatePicker>
    );
  }
}

Picker.propsTypes = propsTypes;

export default Picker;
