import React, { Fragment, useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import Chart from '../../../components/chart';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import { gettext, orgID } from '../../../utils/constants';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { Utils } from '../../../utils/utils';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticCommonTool from './statistic-common-tool';
import StatisticNav from './statistic-nav';

const OrgStatisticUsers = () => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const legends = useMemo(() => [{
    key: 'count',
    name: gettext('Active Users'),
    color: '#fd913a',
  }], []);
  const yMax = useMemo(() => 10, []);

  const getActivesFiles = useCallback((startTime, endTime, groupBy) => {
    setLoading(true);
    orgAdminAPI.orgAdminStatisticActiveUsers(orgID, startTime, endTime, groupBy).then((res) => {
      const data = Array.isArray(res.data) ? res.data.map(d => {
        const { count, datetime } = d;
        return {
          name: dayjs(datetime).format('YYYY-MM-DD'),
          count,
        };
      }) : [];
      setData(data);
      setLoading(false);
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }, []);

  return (
    <Fragment>
      <MainPanelTopbar />
      <div className="cur-view-container">
        <StatisticNav currentItem="usersStatistic" />
        <div className="cur-view-content">
          <StatisticCommonTool getActivesFiles={getActivesFiles} />
          {isLoading && <Loading />}
          {!isLoading && data.length > 0 && (
            <Chart title={gettext('Active Users')} legends={legends} data={data} ySuggestedMax={yMax} />
          )}
        </div>
      </div>
    </Fragment>
  );

};

export default OrgStatisticUsers;
