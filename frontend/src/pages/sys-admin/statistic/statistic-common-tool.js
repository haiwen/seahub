import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import { gettext } from '../../../utils/constants';

import 'react-datepicker/dist/react-datepicker.css';

const propTypes = {
  getActiviesFiles: PropTypes.func.isRequired,
  children: PropTypes.object,
};

class StatisticCommonTool extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      itemActive: 'oneWeek',
      startDate: null,
      endDate: null,
      errorTip: false,
      errorMessage: ''
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
      errorTip: false
    });
    this.props.getActiviesFiles(startTime, endTime);
  }

  handleChange = date => {
    this.setState({
      startDate: date
    });
  }

  handleEndChange = date => {
    this.setState({
      endDate: date
    });
  }

  onSubmit = () => {
    let { startDate, endDate } = this.state;
    let errorMessage;
    if(!startDate || !endDate) {
      return;
    }
    if (startDate > endDate) {
      errorMessage = gettext('The initial date should be earlier than the end date.');
      this.setState({
        errorTip: true,
        errorMessage: errorMessage
      });
      return;
    }
    this.setState({
      itemActive: 'itemButton',
      errorTip: false
    });
    let startTime = moment(startDate).format('YYYY-MM-DD 00:00:00');
    let endTime = moment(endDate).format('YYYY-MM-DD 00:00:00');
    let group_by = 'day';
    this.props.getActiviesFiles(startTime, endTime, group_by);
  }

  render() {
    let { itemActive, errorTip, errorMessage } = this.state;
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
            <DatePicker
              dateFormat="yyyy-MM-dd"
              onChange={this.handleChange}
              selected={this.state.startDate}
              maxDate={new Date()}
              placeholderText="yyyy-mm-dd"
              className="system-statistic-input form-control"
            />
            <span style={{padding: '0 5px', lineHeight: 1}}>-</span>
            <DatePicker
              dateFormat="yyyy-MM-dd"
              onChange={this.handleEndChange}
              selected={this.state.endDate}
              maxDate={new Date()}
              placeholderText="yyyy-mm-dd"
              className="system-statistic-input form-control"
            />
            <Button className="operation-item" style={{height: '31px',marginLeft: '1rem'}} onClick={this.onSubmit}>{gettext('Submit')}</Button>
          </div>
          {errorTip && 
            <div className="error-tip">{errorMessage}</div>
          }
        </div>
      </Fragment>
    );
  }
}

StatisticCommonTool.propTypes = propTypes;

export default StatisticCommonTool;