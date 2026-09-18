import React, { Fragment } from 'react';
import { Button, Input } from 'reactstrap';
import dayjs from 'dayjs';
import MainPanelTopbar from '@/components/admin/layout/main-panel-topbar';
import { siteRoot, gettext, orgID, serviceURL } from '@/utils/constants';
import { formatMonthInput, isValidMonthInput, normalizeMonthValue } from '@/utils/month-input';
import StatisticNav from './statistic-nav';

class OrgStatisticReports extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      month: dayjs().format('YYYY-MM'),
      errorMessage: ''
    };
  }

  handleChange = (e) => {
    let month = formatMonthInput(e.target.value);
    this.setState({
      month: month,
      errorMessage: ''
    });
  };

  onGenerateReports = (type) => {
    let url = serviceURL + siteRoot + 'api/v2.1/org/' + orgID + '/admin/statistics/';
    let { month } = this.state;
    if (!month) {
      let errorMessage = gettext('It is required.');
      this.setState({
        errorMessage: errorMessage
      });
      return;
    }
    if (type === 'month') {
      if (!isValidMonthInput(month)) {
        let errorMessage = gettext('Invalid month, should be YYYY-MM.');
        this.setState({
          errorMessage: errorMessage
        });
        return;
      }
    }
    switch (type) {
      case 'month':
        url += 'user-traffic/excel/?month=' + normalizeMonthValue(month);
        break;
      case 'storage':
        url += 'user-storage/excel/?';
        break;
    }
    this.setState({
      errorMessage: ''
    });
    window.location.href = new URL(url);
  };

  render() {

    let { errorMessage, month } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="cur-view-container statistic-reports-page">
          <StatisticNav currentItem="reportsStatistic" />
          <div className="cur-view-content">
            <div className="statistic-reports">
              <h3 className="sf-heading statistic-reports-title">{gettext('Monthly User Traffic')}</h3>
              <div className="d-flex align-items-center mt-4">
                <span className="statistic-reports-tip">{gettext('Month')}</span>
                <Input
                  className="statistic-reports-input"
                  value={month}
                  onChange={this.handleChange}
                  placeholder="YYYY-MM"
                  inputMode="numeric"
                  maxLength={7}
                />
                <Button color="secondary" size="sm" className="statistic-reports-submit" onClick={this.onGenerateReports.bind(this, 'month')}>{gettext('Create Report')}</Button>
              </div>
              {errorMessage && <div className="error">{errorMessage}</div>}
            </div>
            <div className="statistic-reports">
              <h3 className="sf-heading statistic-reports-title">{gettext('User Storage')}</h3>
              <Button color="secondary" size="sm" className="mt-4" onClick={this.onGenerateReports.bind(this, 'storage')}>{gettext('Create Report')}</Button>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgStatisticReports;
