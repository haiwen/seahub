import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import moment from 'moment';
import { gettext } from '../../../utils/constants';
import Picker from './picker';

const propTypes = {
  getActiviesFiles: PropTypes.func.isRequired,
  children: PropTypes.object,
};

class StatisticCommonTool extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      statisticType: 'oneWeek',
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

  changeActive = (statisticTypeName) => {
    let { statisticType } = this.state;
    if (statisticType === statisticTypeName) {
      return;
    }
    let today = moment().format('YYYY-MM-DD 00:00:00');
    let endTime = today;
    let startTime;
    switch(statisticTypeName) {
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
      statisticType: statisticTypeName,
    });
    let group_by = 'day';
    this.props.getActiviesFiles(startTime, endTime, group_by);
  }

  disabledStartDate = (startValue) => {
    if (!startValue) {
      return false;
    }
    let today = moment().format();

    const endValue = this.state.endValue;
    if (!endValue) {
      let startTime = moment(startValue).format();
      return today < startTime;
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
      statisticType: 'itemButton',
    });
    let startTime = moment(startValue).format('YYYY-MM-DD 00:00:00');
    let endTime = moment(endValue).format('YYYY-MM-DD 00:00:00');
    let group_by = 'day';
    this.props.getActiviesFiles(startTime, endTime, group_by);
  }

  render() {
    let { statisticType, endValue, startValue } = this.state;
    return(
      <Fragment>
        {this.props.children}
        <div className="system-statistic-time-range">
          <div className="sys-stat-tool">
            <div className={`system-statistic-item border-right-0 rounded-left ${statisticType === 'oneWeek' ? 'item-active' : ''}`} onClick={this.changeActive.bind(this, 'oneWeek')}>{gettext('7 Days')}</div>
            <div className={`system-statistic-item border-right-0 ${statisticType === 'oneMonth' ? 'item-active' : ''}`}  onClick={this.changeActive.bind(this, 'oneMonth')}>{gettext('30 Days')}</div>
            <div className={`system-statistic-item rounded-right ${statisticType === 'oneYear' ? 'item-active' : ''}`}  onClick={this.changeActive.bind(this, 'oneYear')}>{gettext('1 Year')}</div>
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
