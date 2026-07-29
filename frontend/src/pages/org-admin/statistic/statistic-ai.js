import React, { Fragment, useCallback } from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import { gettext, orgID } from '../../../utils/constants';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import AIStatisticsPage from '../../common/ai-statistics';

const tabs = [
  { value: 'overview', label: gettext('Overview') },
  { value: 'repo', label: gettext('Library') },
  { value: 'group', label: gettext('Department') },
];

const detailOptionsMap = {
  repo: [
    { value: 'date', label: gettext('Date') },
  ],
  group: [
    { value: 'date', label: gettext('Date') },
    { value: 'repo', label: gettext('Library') },
  ],
};

const OrgStatisticAI = () => {
  const listFetcher = useCallback((date, month, groupBy, page, perPage) => {
    return orgAdminAPI.orgAdminGetAIStatistics(orgID, date, month, groupBy, page, perPage);
  }, []);

  const detailFetcher = useCallback((groupBy, startDate, endDate, condition, scenarios) => {
    return orgAdminAPI.orgAdminGetAIStatisticsDetail(orgID, groupBy, startDate, endDate, condition, scenarios);
  }, []);

  const overviewFetcher = useCallback((groupBy) => {
    return orgAdminAPI.orgAdminGetAIStatisticsOverview(orgID, groupBy);
  }, []);

  return (
    <Fragment>
      <MainPanelTopbar />
      <div className="cur-view-container">
        <StatisticNav currentItem="aiStatistic" />
        <div className="cur-view-content">
          <AIStatisticsPage
            defaultGroupBy="overview"
            detailOptionsMap={detailOptionsMap}
            enableOverview={true}
            groupLabel={gettext('Department')}
            listFetcher={listFetcher}
            detailFetcher={detailFetcher}
            overviewFetcher={overviewFetcher}
            tabs={tabs}
          />
        </div>
      </div>
    </Fragment>
  );
};

export default OrgStatisticAI;
