import React, { Fragment } from 'react';
import moment from 'moment';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import StatisticCommonTool from './statistic-common-tool';
import { seafileAPI } from '../../../utils/seafile-api';
import StatisticChart from './statistic-chart';
import Loading from '../../../components/loading';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';

class StatisticStorage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      filesData: [],
      labels: [],
      isLoading: true
    };
  }

  getActiviesFiles = (startTime, endTime, groupBy) => {
    let { filesData } = this.state;
    seafileAPI.sysAdminStatisticStorages(startTime, endTime, groupBy).then((res) => {
      let labels = [],
        totalStorage = [];
      let data = res.data;
      if (Array.isArray(data)) {
        data.forEach(item => {
          labels.push(moment(item.datetime).format('YYYY-MM-DD'));
          totalStorage.push(item.total_storage);
        });
        let total_storage = {
          label: gettext('Total Storage'),
          data: totalStorage,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a'};
        filesData = [total_storage];
      }
      this.setState({
        filesData: filesData,
        labels: labels,
        isLoading: false
      });
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { labels, filesData, isLoading } = this.state;
    return(
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="cur-view-container">
          <StatisticNav currentItem="storageStatistic" />
          <div className="cur-view-content">
            <StatisticCommonTool getActiviesFiles={this.getActiviesFiles} />
            {isLoading && <Loading />}
            {!isLoading && labels.length > 0 &&
              <StatisticChart
                labels={labels}
                filesData={filesData}
                suggestedMaxNumbers={10*1000*1000}
                isTitleCallback={true}
                isTicksCallback={true}
                isLegendStatus={false}
                chartTitle={gettext('Total Storage')}
              />
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

export default StatisticStorage;
