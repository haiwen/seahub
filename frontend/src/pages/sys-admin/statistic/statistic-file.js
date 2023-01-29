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

import '../../../css/system-stat.css';

class StatisticFile extends React.Component {

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
    seafileAPI.sysAdminStatisticFiles(startTime, endTime, groupBy).then((res) => {
      let labels = [],
        added = [],
        deleted = [],
        visited = [],
        modified = [];
      let data = res.data;
      if (Array.isArray(data)) {
        data.forEach(item => {
          labels.push(moment(item.datetime).format('YYYY-MM-DD'));
          added.push(item.added);
          deleted.push(item.deleted);
          modified.push(item.modified);
          visited.push(item.visited);
        });
        let addedData = {
          label: gettext('Added'),
          data: added,
          borderColor: '#57cd6b',
          backgroundColor: '#57cd6b'};
        let visitedData = {
          label: gettext('Visited'),
          data: visited,
          borderColor: '#fd913a',
          backgroundColor: '#fd913a'};
        let modifiedData = {
          label: gettext('Modified'),
          data: modified,
          borderColor: '#72c3fc',
          backgroundColor: '#72c3fc'};
        let deletedData = {
          label: gettext('Deleted'),
          data: deleted,
          borderColor: '#f75356',
          backgroundColor: '#f75356'};
        filesData = [visitedData, addedData, modifiedData, deletedData];
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
          <StatisticNav currentItem="fileStatistic" />
          <div className="cur-view-content">
            <StatisticCommonTool getActiviesFiles={this.getActiviesFiles} />
            {isLoading && <Loading />}
            {!isLoading && labels.length > 0 &&
              <StatisticChart
                labels={labels}
                filesData={filesData}
                suggestedMaxNumbers={10}
                isLegendStatus={true}
                chartTitle={gettext('File Operations')}
              />
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

export default StatisticFile;
