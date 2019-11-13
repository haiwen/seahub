import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import enUS from '@seafile/seafile-calendar/lib/locale/en_US';
import zhCN from '@seafile/seafile-calendar/lib/locale/zh_CN';

import '@seafile/seafile-calendar/assets/index.css';

const propsTypes = {
  disabledDate: PropTypes.func.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
}

const NOW = moment();
window.app.config.lang == 'zh-cn' ? NOW.locale('zh-cn') : NOW.locale('en-gb');

class Picker extends React.Component {

  constructor(props) {
    super(props);
    this.defaultCalendarValue = null;
  }

  componentDidMount() {
    this.defaultCalendarValue = NOW.clone();
  }

  getFormat = () => {
    return 'YYYY-MM-DD';
  }

  render() {
    const props = this.props;
    let lang = window.app.config.lang == 'zh-cn' ? zhCN : enUS;
    const calendar = (<Calendar
      defaultValue={this.defaultCalendarValue}
      disabledDate={props.disabledDate}
      format={this.getFormat()}
      locale={lang}
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
                value={value && value.format(this.getFormat(props.showTime)) || ''}
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