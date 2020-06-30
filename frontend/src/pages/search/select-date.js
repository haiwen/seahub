import React from 'react';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import '@seafile/seafile-calendar/assets/index.css';
import moment from 'moment';

const zhCN = require('@seafile/seafile-calendar/lib/locale/zh_CN');
const zhTW = require('@seafile/seafile-calendar/lib/locale/zh_TW');
const enUS = require('@seafile/seafile-calendar/lib/locale/en_US');
const frFR = require('@seafile/seafile-calendar/lib/locale/fr_FR');
const deDE = require('@seafile/seafile-calendar/lib/locale/de_DE');
const esES = require('@seafile/seafile-calendar/lib/locale/es_ES');
const plPL = require('@seafile/seafile-calendar/lib/locale/pl_PL');
const csCZ = require('@seafile/seafile-calendar/lib/locale/cs_CZ');

const format = 'YYYY-MM-DD';
const now = moment();
const defaultCalendarValue = now.clone();
class SelectDate extends React.Component {  
  constructor(props) {
    super(props);
    this.state = {
      showTime: true,
      showDateInput: true,
      disabled: false,
      value: moment(props.value)
    };
  }
  
  onChange = (value) => {
    this.props.onDateChange(value? value.format(format) : '');
    this.setState({
      value: value
    }); 
  }

  toggleDisabled = () => {
    this.setState({
      disabled: !this.state.disabled         
    });
  }

  translateCalendar = (locale) => {
    let language = enUS;
    if (locale) {
      switch (locale) {
      case 'zh-ch':
        language = zhCN;
        break;
      case 'zh-tw':
        language = zhTW;
        break;
      case 'en':
        language = enUS;
        break;
      case 'fr':
        language = frFR;
        break;
      case 'de':
        language = deDE;
        break;
      case 'es':
        language = esES;
        break;
      case 'es-ar':
        language = esES;
        break;
      case 'es-mx':
        language = esES;
        break;
      case 'pl':
        language = plPL;
        break;
      case 'cs':
        language = csCZ;
        break;
      }
    }
    return language;
  }

  render() {
    const state = this.state;
    let locale = this.translateCalendar(this.props.locale);

    const calendar = (
      <Calendar
        style = {{zIndex: 1000}}
        format={format}
        showDateInput={false}
        defaultValue={defaultCalendarValue}
        locale={locale}
      />  
    );
   
    return (
      <DatePicker
        animation={'slide-up'}
        calendar={calendar}
        value={this.props.value=== '' ? defaultCalendarValue : state.value}
        onChange={this.onChange}
      >
        {
          ({ value }) => {
            let showValue;
            if (this.state.value.format(format) === 'Invalid date') {
              showValue = '';
            } else {
              showValue = value.format(format);
            }
            return (
              <span tabIndex='0'>
                <input
                  style={{width: '100%'}}
                  disabled={state.disabled}
                  readOnly
                  tabIndex='-1'
                  className='ant-calendar-pick-input ant-input'
                  value={showValue}
                />  
              </span>  
            );
          }  
        }
      </DatePicker>  
    );
  }
}

export default SelectDate;