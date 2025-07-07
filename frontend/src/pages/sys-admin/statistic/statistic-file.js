import React, { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import StatisticCommonTool from './statistic-common-tool';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import Loading from '../../../components/loading';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Chart from '../../../chart';

import '../../../css/system-stat.css';

const StatisticFile = (props) => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const legends = useMemo(() => [
    { key: 'added', color: '#57cd6b', name: gettext('Added') },
    { key: 'visited', color: '#fd913a', name: gettext('Visited') },
    { key: 'modified', color: '#72c3fc', name: gettext('Modified') },
    { key: 'deleted', color: '#f75356', name: gettext('Deleted') },
  ], []);

  const getActivesFiles = useCallback((startTime, endTime, groupBy) => {
    setLoading(true);
    systemAdminAPI.sysAdminStatisticFiles(startTime, endTime, groupBy).then((res) => {
      const data = Array.isArray(res.data) ? res.data.map(d => {
        const { added, deleted, modified, visited, datetime } = d;
        return {
          name: dayjs(datetime).format('YYYY-MM-DD'),
          added,
          deleted,
          modified,
          visited,
        };
      }) : [];
      setLoading(false);
      setData(data);
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }, []);

  return (
    <div className="cur-view-container">
      <div className="cur-view-content">
        <StatisticCommonTool getActivesFiles={getActivesFiles} />
        {isLoading && <Loading />}
        {!isLoading && data.length > 0 &&
        <Chart title={gettext('File Operations')} data={data} legends={legends} />
        }
      </div>
    </div>
  );

};

export default StatisticFile;
