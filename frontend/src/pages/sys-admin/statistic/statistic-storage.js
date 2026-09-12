import React, { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import StatisticCommonTool from '../../../components/admin/statistics/statistic-common-tool';
import Chart from '../../../components/chart';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { Utils } from '../../../utils/utils';

const StatisticStorage = (props) => {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const legends = useMemo(() => [{
    key: 'total_storage',
    name: gettext('Total Storage'),
    color: '#fd913a',
  }], []);
  const yMax = useMemo(() => 10 * 1000 * 1000, []);

  const getActivesFiles = useCallback((startTime, endTime, groupBy) => {
    setLoading(true);
    systemAdminAPI.sysAdminStatisticStorages(startTime, endTime, groupBy).then((res) => {
      const data = Array.isArray(res.data) ? res.data.map(d => {
        const { total_storage, datetime } = d;
        return {
          name: dayjs(datetime).format('YYYY-MM-DD'),
          total_storage,
        };
      }) : [];
      setData(data);
      setLoading(false);
    }).catch(err => {
      let errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  }, []);

  const getDisplayValue = useCallback((value) => {
    return Utils.bytesToSize(value);
  }, []);

  return (
    <div className="cur-view-container">
      <div className="cur-view-content">
        <StatisticCommonTool getActivesFiles={getActivesFiles} />
        {isLoading && <Loading />}
        {!isLoading && data.length > 0 && (
          <Chart
            title={gettext('Total Storage')}
            legends={legends}
            data={data}
            margin={{ top: 60, right: 30, bottom: 30, left: 60 }}
            ySuggestedMax={yMax}
            getDisplayValue={getDisplayValue}
          />
        )}
      </div>
    </div>
  );

};

export default StatisticStorage;
