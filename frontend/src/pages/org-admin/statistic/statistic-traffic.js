import React, { Fragment } from 'react';
import dayjs from 'dayjs';
import { gettext, orgID } from '../../../utils/constants';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import StatisticCommonTool from './statistic-common-tool';
import Loading from '../../../components/loading';
import UsersTraffic from './statistic-traffic-users';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Chart from '../../../chart';

class OrgStatisticTraffic extends React.Component {

  constructor(props) {
    super(props);
    this.legends = [
      { key: 'upload', name: gettext('Upload'), color: '#fd913a' },
      { key: 'download', name: gettext('Download'), color: '#57cd6b' }
    ];
    this.state = {
      totalData: [],
      linkData: [],
      syncData: [],
      webData: [],
      isLoading: true,
      tabActive: 'system'
    };
  }

  changeTabActive = activeName => {
    this.setState({ tabActive: activeName });
  };

  getActivesFiles = (startTime, endTime, groupBy) => {
    orgAdminAPI.orgAdminStatisticSystemTraffic(orgID, startTime, endTime, groupBy).then((res) => {
      let totalData = [];
      let webData = [];
      let linkData = [];
      let syncData = [];
      let data = res.data;
      if (Array.isArray(data)) {
        data.forEach(item => {
          const { datetime, } = item;
          const name = dayjs(datetime).format('YYYY-MM-DD');

          webData.push({
            name,
            upload: item['web-file-upload'],
            download: item['web-file-download'],
          });

          linkData.push({
            name,
            upload: item['link-file-upload'],
            download: item['link-file-download'],
          });

          syncData.push({
            name,
            upload: item['sync-file-upload'],
            download: item['sync-file-download'],
          });

          totalData.push({
            name,
            upload: item['link-file-upload'] + item['sync-file-upload'] + item['web-file-upload'],
            download: item['link-file-download'] + item['sync-file-download'] + item['web-file-download'],
          });
        });
      }
      this.setState({ linkData, syncData, webData, totalData, isLoading: false });
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  };

  getDisplayValue = (value) => {
    return Utils.bytesToSize(value);
  };

  renderCommonTool = () => {
    let { tabActive } = this.state;
    if (tabActive === 'system') {
      return (
        <StatisticCommonTool getActivesFiles={this.getActivesFiles}>
          <div className="statistic-traffic-tab">
            <div className={`statistic-traffic-tab-item ${tabActive === 'system' ? 'active' : ''}`} onClick={this.changeTabActive.bind(this, 'system')}>{gettext('System')}</div>
            <div className={`statistic-traffic-tab-item ${tabActive === 'user' ? 'active' : ''}`} onClick={this.changeTabActive.bind(this, 'user')}>{gettext('Users')}</div>
          </div>
        </StatisticCommonTool>
      );
    }
    return (
      <div className="statistic-traffic-tab">
        <div className={`statistic-traffic-tab-item ${tabActive === 'system' ? 'active' : ''}`} onClick={this.changeTabActive.bind(this, 'system')}>{gettext('System')}</div>
        <div className={`statistic-traffic-tab-item ${tabActive === 'user' ? 'active' : ''}`} onClick={this.changeTabActive.bind(this, 'user')}>{gettext('Users')}</div>
      </div>
    );
  };

  render() {
    const { totalData, linkData, syncData, webData, isLoading, tabActive } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="cur-view-container">
          <StatisticNav currentItem="trafficStatistic" />
          <div className="cur-view-content">
            {this.renderCommonTool()}
            {isLoading && <Loading />}
            {!isLoading && tabActive === 'system' &&
              <div className="statistic-traffic-chart-container">
                {totalData.length > 0 && (
                  <div className="mb-4">
                    <Chart
                      legends={this.legends}
                      data={totalData}
                      title={gettext('Total Traffic')}
                      ySuggestedMax={10 * 1000 * 1000}
                      margin={{ top: 60, right: 30, bottom: 30, left: 60 }}
                      getDisplayValue={this.getDisplayValue}
                    />
                  </div>
                )}
                {webData.length > 0 && (
                  <div className="mb-4">
                    <Chart
                      legends={this.legends}
                      data={webData}
                      title={gettext('Web Traffic')}
                      ySuggestedMax={10 * 1000 * 1000}
                      margin={{ top: 60, right: 30, bottom: 30, left: 60 }}
                      getDisplayValue={this.getDisplayValue}
                    />
                  </div>
                )}
                {linkData.length > 0 && (
                  <div className="mb-4">
                    <Chart
                      legends={this.legends}
                      data={linkData}
                      title={gettext('Share Link Traffic')}
                      ySuggestedMax={10 * 1000 * 1000}
                      margin={{ top: 60, right: 30, bottom: 30, left: 60 }}
                      getDisplayValue={this.getDisplayValue}
                    />
                  </div>
                )}
                {syncData.length > 0 && (
                  <div className="mb-4">
                    <Chart
                      legends={this.legends}
                      data={syncData}
                      title={gettext('Sync Traffic')}
                      ySuggestedMax={10 * 1000 * 1000}
                      margin={{ top: 60, right: 30, bottom: 30, left: 60 }}
                      getDisplayValue={this.getDisplayValue}
                    />
                  </div>
                )}
              </div>
            }
            {!isLoading && tabActive === 'user' &&
              <UsersTraffic />
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgStatisticTraffic;
