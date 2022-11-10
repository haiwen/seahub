import React, { Fragment } from 'react';
import moment from 'moment';
import { gettext, orgID } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import StatisticCommonTool from './statistic-common-tool';
import Loading from '../../../components/loading';
import UsersTraffic from './statistic-traffic-users';
import StatisticChart from './statistic-chart';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';

class OrgStatisticTraffic extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filesData: [],
      linkData: [],
      syncData: [],
      webData: [],
      labels: [],
      isLoading: true,
      tabActive: 'system'
    };
  }

  changeTabActive = activeName => {
    this.setState({tabActive: activeName});
  }

  getActiviesFiles = (startTime, endTime, groupBy) => {
    seafileAPI.orgAdminStatisticSystemTraffic(orgID, startTime, endTime, groupBy).then((res) => {
      let labels = [];
      let total_upload = [],
        total_download = [],
        link_upload = [],
        link_download = [],
        sync_upload = [],
        sync_download = [],
        web_upload = [],
        web_download = [];
      let data = res.data;
      if (Array.isArray(data)) {
        data.forEach(item => {
          labels.push(moment(item.datetime).format('YYYY-MM-DD'));
          link_upload.push(item['link-file-upload']);
          link_download.push(item['link-file-download']);
          sync_upload.push(item['sync-file-upload']);
          sync_download.push(item['sync-file-download']);
          web_upload.push(item['web-file-upload']);
          web_download.push(item['web-file-download']);
          total_upload.push(item['link-file-upload'] + item['sync-file-upload'] + item['web-file-upload']);
          total_download.push(item['link-file-download'] + item['sync-file-download'] + item['web-file-download']);
        });
        let linkUpload = {
          label: gettext('Upload'),
          data: link_upload,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a'};
        let linkDownload = {
          label: gettext('Download'),
          data: link_download,
          borderColor: '#57cd6b',
          backgroundColor: '#57cd6b'};
        let syncUpload = {
          label: gettext('Upload'),
          data: sync_upload,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a'};
        let syncDownload = {
          label: gettext('Download'),
          data: sync_download,
          borderColor: '#57cd6b',
          backgroundColor: '#57cd6b'};
        let webUpload = {
          label: gettext('Upload'),
          data: web_upload,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a'};
        let webDownload = {
          label: gettext('Download'),
          data: web_download,
          borderColor: '#57cd6b',
          backgroundColor: '#57cd6b'};
        let totalUpload = {
          label: gettext('Upload'),
          data: total_upload,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a'};
        let totalDownload = {
          label: gettext('Download'),
          data: total_download,
          borderColor: '#57cd6b',
          backgroundColor: '#57cd6b'};
        let linkData = [linkUpload, linkDownload];
        let syncData = [syncUpload, syncDownload];
        let webData = [webUpload, webDownload];
        let filesData = [totalUpload, totalDownload];
        this.setState({
          linkData: linkData,
          syncData: syncData,
          webData: webData,
          filesData: filesData,
          labels: labels,
          isLoading: false
        });
      }
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  renderCommonTool = () => {
    let { tabActive } = this.state;
    if (tabActive === 'system') {
      return (
        <StatisticCommonTool getActiviesFiles={this.getActiviesFiles}>
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
  }

  render() {
    let { labels, filesData, linkData, syncData, webData, isLoading, tabActive } = this.state;

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
                <div className="mb-4">
                  {labels.length > 0 &&
                    <StatisticChart
                      labels={labels}
                      filesData={filesData}
                      chartTitle={gettext('Total Traffic')}
                      suggestedMaxNumbers={10*1000*1000}
                      isTitleCallback={true}
                      isTicksCallback={true}
                      isLegendStatus={true}
                    />
                  }
                </div>
                <div className="mb-4">
                  {labels.length > 0 &&
                    <StatisticChart
                      labels={labels}
                      filesData={webData}
                      chartTitle={gettext('Web Traffic')}
                      suggestedMaxNumbers={10*1000*1000}
                      isTitleCallback={true}
                      isTicksCallback={true}
                      isLegendStatus={true}
                    />
                  }
                </div>
                <div className="mb-4">
                  {labels.length > 0 &&
                    <StatisticChart
                      labels={labels}
                      filesData={linkData}
                      chartTitle={gettext('Share Link Traffic')}
                      suggestedMaxNumbers={10*1000*1000}
                      isTitleCallback={true}
                      isTicksCallback={true}
                      isLegendStatus={true}
                    />
                  }
                </div>
                <div className="mb-4">
                  {labels.length > 0 &&
                    <StatisticChart
                      labels={labels}
                      filesData={syncData}
                      chartTitle={gettext('Sync Traffic')}
                      suggestedMaxNumbers={10*1000*1000}
                      isTitleCallback={true}
                      isTicksCallback={true}
                      isLegendStatus={true}
                    />
                  }
                </div>
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
