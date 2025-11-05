import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'reactstrap';
import dayjs from 'dayjs';
import { gettext } from '../../../utils/constants';
import Picker from './picker';

const propTypes = {
  getActivesFiles: PropTypes.func.isRequired,
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
    let today = dayjs().format('YYYY-MM-DD 00:00:00');
    let endTime = today;
    let startTime = dayjs().subtract(6, 'd').format('YYYY-MM-DD 00:00:00');
    let group_by = 'day';
    this.props.getActivesFiles(startTime, endTime, group_by);
  }

  changeActive = (statisticTypeName) => {
    let { statisticType } = this.state;
    if (statisticType === statisticTypeName) {
      return;
    }
    let today = dayjs().format('YYYY-MM-DD 00:00:00');
    let endTime = today;
    let startTime;
    switch (statisticTypeName) {
      case 'oneWeek' :
        startTime = dayjs().subtract(6, 'd').format('YYYY-MM-DD 00:00:00');
        break;
      case 'oneMonth' :
        startTime = dayjs().subtract(29, 'd').format('YYYY-MM-DD 00:00:00');
        break;
      case 'oneYear' :
        startTime = dayjs().subtract(364, 'd').format('YYYY-MM-DD 00:00:00');
        break;
    }
    this.setState({
      statisticType: statisticTypeName,
    });
    let group_by = 'day';
    this.props.getActivesFiles(startTime, endTime, group_by);
  };

  disabledStartDate = (startValue) => {
    if (!startValue) {
      return false;
    }
    let today = dayjs().format();

    const endValue = this.state.endValue;
    if (!endValue) {
      let startTime = dayjs(startValue).format();
      return today < startTime;
    }
    return endValue.isBefore(startValue) || dayjs(startValue).format() > today;
  };

  disabledEndDate = (endValue) => {
    if (!endValue) {
      return false;
    }
    let today = dayjs().format();
    const startValue = this.state.startValue;
    if (!startValue) {
      let endTime = dayjs(endValue).format();
      return today < endTime;
    }
    return endValue.isBefore(startValue) || dayjs(endValue).format() > today;
  };

  onChange = (field, value) => {
    this.setState({
      [field]: value,
    });
  };

  onSubmit = () => {
    let { startValue, endValue } = this.state;
    if (!startValue || !endValue) {
      return;
    }
    this.setState({
      statisticType: 'itemButton',
    });
    let startTime = dayjs(startValue).format('YYYY-MM-DD HH:mm:ss');
    let endTime = dayjs(endValue).format('YYYY-MM-DD HH:mm:ss');
    let group_by = 'day';
    this.props.getActivesFiles(startTime, endTime, group_by);
  };

  render() {
    let { statisticType, endValue, startValue } = this.state;
    return (
      <Fragment>
        {this.props.children}
        <div className="system-statistic-time-range">
          <ButtonGroup size="sm" className="sys-stat-tool">
            <Button className={`font-weight-normal ${statisticType === 'oneWeek' ? 'item-active' : ''}`} onClick={this.changeActive.bind(this, 'oneWeek')}>{gettext('7 Days')}</Button>
            <Button className={`font-weight-normal ${statisticType === 'oneMonth' ? 'item-active' : ''}`} onClick={this.changeActive.bind(this, 'oneMonth')}>{gettext('30 Days')}</Button>
            <Button className={`font-weight-normal ${statisticType === 'oneYear' ? 'item-active' : ''}`} onClick={this.changeActive.bind(this, 'oneYear')}>{gettext('1 Year')}</Button>
          </ButtonGroup>
          <div className="system-statistic-input-container">
            <Picker
              disabledDate={this.disabledStartDate}
              value={startValue}
              onChange={value => this.onChange('startValue', value?.startOf('day'))}
            />
            <span className="system-statistic-connect">-</span>
            <Picker
              disabledDate={this.disabledEndDate}
              value={endValue}
              onChange={value => this.onChange('endValue', value?.endOf('day'))}
            />
            <Button color="primary" size="sm" className="system-statistic-button" onClick={this.onSubmit}>{gettext('Submit')}</Button>
          </div>
        </div>
      </Fragment>
    );
  }
}

StatisticCommonTool.propTypes = propTypes;

export default StatisticCommonTool;
