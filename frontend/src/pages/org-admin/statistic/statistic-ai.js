import React, { Fragment, useCallback } from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import { gettext, orgID } from '../../../utils/constants';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import AIStatisticsPage from '../../common/ai-statistics';

const tabs = [
  { value: 'overview', label: gettext('Overview') },
  { value: 'repo', label: gettext('Library') },
  { value: 'user', label: gettext('User') },
  { value: 'group', label: gettext('Group') },
];

const detailOptionsMap = {
  repo: [
    { value: 'date', label: gettext('Date') },
    { value: 'user', label: gettext('User') },
  ],
  user: [
    { value: 'date', label: gettext('Date') },
    { value: 'repo', label: gettext('Library') },
  ],
  group: [
    { value: 'date', label: gettext('Date') },
    { value: 'user', label: gettext('User') },
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
