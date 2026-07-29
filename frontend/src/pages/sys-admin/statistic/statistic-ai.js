import React, { useCallback } from 'react';
import { gettext } from '../../../utils/constants';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import AIStatisticsPage from '../../common/ai-statistics';

const tabs = [
  { value: 'repo', label: gettext('Library') },
  { value: 'group', label: gettext('Department') },
  { value: 'org', label: gettext('Team') },
];

const detailOptionsMap = {
  repo: [
    { value: 'date', label: gettext('Date') },
  ],
  group: [
    { value: 'date', label: gettext('Date') },
    { value: 'repo', label: gettext('Library') },
  ],
  org: [
    { value: 'date', label: gettext('Date') },
    { value: 'repo', label: gettext('Library') },
  ],
};

const StatisticAI = () => {
  const listFetcher = useCallback((date, month, groupBy, page, perPage) => {
    return systemAdminAPI.sysAdminGetAIStatistics(date, month, groupBy, page, perPage);
  }, []);

  const detailFetcher = useCallback((groupBy, startDate, endDate, condition, scenarios) => {
    return systemAdminAPI.sysAdminGetAIStatisticsDetail(groupBy, startDate, endDate, condition, scenarios);
  }, []);

  return (
    <div className="cur-view-container">
      <div className="cur-view-content">
        <AIStatisticsPage
          defaultGroupBy="repo"
          detailOptionsMap={detailOptionsMap}
          detailFetcher={detailFetcher}
          groupLabel={gettext('Department')}
          listFetcher={listFetcher}
          showOrgColumn={true}
          tabs={tabs}
        />
      </div>
    </div>
  );
};

export default StatisticAI;
