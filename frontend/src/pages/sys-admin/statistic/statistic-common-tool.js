import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import moment from 'moment';
import { gettext } from '../../../utils/constants';
import Calendar from '@seafile/seafile-calendar';
import DatePicker from '@seafile/seafile-calendar/lib/Picker';
import '@seafile/seafile-calendar/assets/index.css';
import enUS from '@seafile/seafile-calendar/lib/locale/en_US';
import zhCN from '@seafile/seafile-calendar/lib/locale/zh_CN';

const propTypes = {
  getActiviesFiles: PropTypes.func.isRequired,
  children: PropTypes.object,
};

const now = moment();

class Picker extends React.Component {

  componentDidMount() {
    const isZhCh = (window.app.config.lang == 'zh-cn');
    if (isZhCh) {
      now.locale('zh-cn');
    } else {
      now.locale('en-gb');
    }
    this.defaultCalendarValue = now.clone();
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
        disabled={props.disabled}
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
                disabled={props.disabled}
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

class StatisticCommonTool extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      itemActive: 'oneWeek',
      startValue: null,
      endValue: null,
    };
  }

  componentDidMount() {
    let today = moment().format('YYYY-MM-DD 00:00:00');
    let endTime = today;
    let startTime = moment().subtract(6,'d').format('YYYY-MM-DD 00:00:00');
    let group_by = 'day';
    this.props.getActiviesFiles(startTime, endTime, group_by);
  }

  changeActive = (activeName) => {
    let { itemActive } = this.state;
    if (itemActive === activeName) {
      return;
    }
    let today = moment().format('YYYY-MM-DD 00:00:00');
    let endTime = today;
    let startTime;
    switch(activeName) {
      case 'oneWeek' : 
        startTime = moment().subtract(6,'d').format('YYYY-MM-DD 00:00:00');
        break;
      case 'oneMonth' : 
        startTime = moment().subtract(29,'d').format('YYYY-MM-DD 00:00:00');
        break;
      case 'oneYear' : 
        startTime = moment().subtract(364,'d').format('YYYY-MM-DD 00:00:00');
        break;
    }
    this.setState({
      itemActive: activeName,
    });
    this.props.getActiviesFiles(startTime, endTime);
  }

  disabledStartDate = (startValue) => {
    if (!startValue) {
      return false;
    }
    let today = moment().format();
    
    const endValue = this.state.endValue;
    if (!endValue) {
      let startTime = moment(startValue).format();
      return today < startTime
    }
    return endValue.isBefore(startValue) || moment(startValue).format() > today;
  }

  disabledEndDate = (endValue) => {
    if (!endValue) {
      return false;
    }
    let today = moment().format();
    const startValue = this.state.startValue;
    if (!startValue) {
      let endTime = moment(endValue).format();
      return today < endTime;
    }
    return endValue.isBefore(startValue) || moment(endValue).format() > today;
  }

  onChange = (field, value) => {
    this.setState({
      [field]: value,
    });
  }

  onSubmit = () => {
    let { startValue, endValue } = this.state;
    if(!startValue || !endValue) {
      return;
    }
    this.setState({
      itemActive: 'itemButton',
    });
    let startTime = moment(startValue).format('YYYY-MM-DD 00:00:00');
    let endTime = moment(endValue).format('YYYY-MM-DD 00:00:00');
    let group_by = 'day';
    this.props.getActiviesFiles(startTime, endTime, group_by);
  }

  render() {
    let { itemActive, endValue, startValue } = this.state;
    return(
      <Fragment>
        {this.props.children}
        <div className="system-statistic-time-range">
          <div className="sys-stat-tool">
            <div className={`system-statistic-item border-right-0 rounded-left ${itemActive === 'oneWeek' ? 'item-active' : ''}`} onClick={this.changeActive.bind(this, 'oneWeek')}>{gettext('7 Days')}</div>
            <div className={`system-statistic-item border-right-0 ${itemActive === 'oneMonth' ? 'item-active' : ''}`}  onClick={this.changeActive.bind(this, 'oneMonth')}>{gettext('30 Days')}</div>
            <div className={`system-statistic-item rounded-right ${itemActive === 'oneYear' ? 'item-active' : ''}`}  onClick={this.changeActive.bind(this, 'oneYear')}>{gettext('1 Year')}</div>
          </div>
          <div className="system-statistic-input-container">
            <Picker
              disabledDate={this.disabledStartDate}
              value={startValue}
              onChange={this.onChange.bind(this, 'startValue')}
            />
            <span className="system-statistic-connect">-</span>
            <Picker
              disabledDate={this.disabledEndDate}
              value={endValue}
              onChange={this.onChange.bind(this, 'endValue')}
            />
            <Button className="operation-item system-statistic-button" onClick={this.onSubmit}>{gettext('Submit')}</Button>
          </div>
        </div>
      </Fragment>
    );
  }
}

StatisticCommonTool.propTypes = propTypes;

export default StatisticCommonTool;