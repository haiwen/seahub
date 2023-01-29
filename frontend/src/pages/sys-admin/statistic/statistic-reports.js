import React, { Fragment } from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import moment from 'moment';
import StatisticNav from './statistic-nav';
import { Button, Input } from 'reactstrap';
import { siteRoot, gettext } from '../../../utils/constants';

class StatisticReports extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      month: moment().format('YYYYMM'),
      errorMessage: ''
    };
  }

  handleChange = (e) => {
    let month = e.target.value;
    this.setState({
      month: month
    });
  }

  onGenerateReports = (type) => {
    let url = siteRoot + 'api/v2.1/admin/statistics/';
    let { month } = this.state;
    if (!month) {
      let errorMessage = gettext('It is required.');
      this.setState({
        errorMessage: errorMessage
      });
      return;
    }
    if (type === 'month') {
      let pattern = /^([012]\d{3})(0[1-9]|1[012])$/;
      if (!pattern.test(month)) {
        let errorMessage = gettext('Invalid month, should be yyyymm.');
        this.setState({
          errorMessage: errorMessage
        });
        return;
      }
    }
    switch(type) {
      case 'month':
        url += 'system-user-traffic/excel/?month=' + month;
        break;
      case 'storage':
        url += 'system-user-storage/excel/?';
        break;
    }
    this.setState({
      errorMessage: ''
    });
    window.location.href = url;
  }

  render() {

    let { errorMessage } = this.state;
    return(
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="cur-view-container">
          <StatisticNav currentItem="reportsStatistic" />
          <div className="cur-view-content">
            <div className="statistic-reports">
              <div className="statistic-reports-title">{gettext('Monthly User Traffic')}</div>
              <div className="d-flex align-items-center mt-4">
                <span className="statistic-reports-tip">{gettext('Month:')}</span>
                <Input className="statistic-reports-input" defaultValue={moment().format('YYYYMM')} onChange={this.handleChange} />
                <Button className="statistic-reports-submit operation-item" onClick={this.onGenerateReports.bind(this, 'month')}>{gettext('Create Report')}</Button>
              </div>
              {errorMessage && <div className="error">{errorMessage}</div>}
            </div>
            <div className="statistic-reports">
              <div className="statistic-reports-title">{gettext('User Storage')}</div>
              <Button className="mt-4 operation-item" onClick={this.onGenerateReports.bind(this, 'storage')}>{gettext('Create Report')}</Button>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default StatisticReports;
