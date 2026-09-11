import React from 'react';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { translateCalendar } from '../../utils/date-format-utils';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

import '@seafile/seafile-calendar/assets/index.css';
import './index.css';

const FORMAT = 'YYYY-MM-DD';

class AdminDatePicker extends React.Component {

  constructor(props) {
    super(props);
    let lang = window.app.config.lang;
    let now = dayjs();
    const isZhcn = lang === 'zh-cn';
    if (isZhcn) {
      now = now.locale('zh-cn');
    } else {
      now = now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
  }

  render() {
    const props = this.props;
    const calendar = (<Calendar
      className="admin-date-picker-calendar"
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
          ({ value }) => {
            return (
              <span>
                <input
                  placeholder="yyyy-mm-dd"
                  tabIndex="-1"
                  readOnly
                  value={value && value.format(FORMAT) || ''}
                  className="form-control admin-date-picker-input"
                />
              </span>
            );
          }
        }
      </DatePicker>
    );
  }
}

AdminDatePicker.propTypes = {
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

export default AdminDatePicker;
