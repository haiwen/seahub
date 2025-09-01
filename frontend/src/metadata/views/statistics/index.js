import React, { useState, useMemo } from 'react';
import { gettext } from '../../../utils/constants';
import Loading from '../../../components/loading';
import SortMenu from '../../../components/sort-menu';
import RadioGroup from '../../components/radio-group';
import EmptyTip from '../../../components/empty-tip';
import { useMetadataView } from '../../hooks/metadata-view';
import { useCollaborators } from '../../hooks/collaborators';
import { PieChart, BarChart, HorizontalBarChart, SummaryCards } from './charts';
import { useStatisticsData } from './useStatisticsData';
import { processFileTypeData, processTimeData, processCreatorData } from './utils';
import { TIME_GROUPING_OPTIONS, CREATOR_SORT_OPTIONS } from '../../constants/view/statistics';

import './index.css';

const Statistics = () => {
  const { repoID } = useMetadataView();
  const { collaborators, getCollaborator: getCollaboratorFromHook } = useCollaborators();
  const { isLoading, statisticsData } = useStatisticsData(repoID);

  const [timeGrouping, setTimeGrouping] = useState('created');
  const [creatorSortBy, setCreatorSortBy] = useState('count');
  const [creatorSortOrder, setCreatorSortOrder] = useState('desc');

  const pieChartData = useMemo(() =>
    processFileTypeData(statisticsData?.fileTypeStats),
  [statisticsData]
  );

  const timeChartData = useMemo(() =>
    processTimeData(statisticsData?.timeStats, timeGrouping),
  [statisticsData, timeGrouping]
  );

  const creatorChartData = useMemo(() =>
    processCreatorData(
      statisticsData?.creatorStats,
      collaborators,
      getCollaboratorFromHook,
      creatorSortBy,
      creatorSortOrder
    ),
  [statisticsData, collaborators, getCollaboratorFromHook, creatorSortBy, creatorSortOrder]
  );

  const handleTimeGroupingChange = (newGrouping) => {
    setTimeGrouping(newGrouping);
  };

  const handleCreatorSortChange = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    setCreatorSortBy(sortBy);
    setCreatorSortOrder(sortOrder);
  };

  if (isLoading) {
    return (
      <div className="statistics-view">
        <div className="statistics-loading">
          <Loading />
        </div>
      </div>
    );
  }

  if (!statisticsData) {
    return (
      <EmptyTip text={gettext('No data available for statistics')} />
    );
  }

  return (
    <div className="statistics-view">
      <div className="statistics-container">
        <div className="chart-container file-type-chart-container">
          <div className="chart-header">
            <h4>{gettext('Files by type')}</h4>
          </div>
          <div className="pie-chart-container">
            <PieChart data={pieChartData} />
          </div>
        </div>

        <div className="chart-container creator-chart-container">
          <div className="chart-header">
            <h4>{gettext('Files by creator')}</h4>
            <SortMenu
              sortBy={creatorSortBy}
              sortOrder={creatorSortOrder}
              sortOptions={CREATOR_SORT_OPTIONS}
              onSelectSortOption={handleCreatorSortChange}
            />
          </div>
          <div className="horizontal-bar-chart-container">
            {creatorChartData.length > 0 ? (
              <HorizontalBarChart data={creatorChartData} />
            ) : (
              <div className="no-data-message">
                {gettext('No creator data available')}
              </div>
            )}
          </div>
        </div>

        <div className="chart-container time-chart-container">
          <div className="chart-header">
            <h4>{gettext('Distributed by time')}</h4>
            <RadioGroup
              className="sf-metadata-time-grouping-setter"
              value={timeGrouping}
              options={TIME_GROUPING_OPTIONS}
              onChange={handleTimeGroupingChange}
            />
          </div>
          <div className="bar-chart-container">
            {timeChartData.length > 0 ? (
              <BarChart
                data={timeChartData}
                unit={statisticsData?.timeStats?.[timeGrouping]?.unit}
              />
            ) : (
              <div className="no-data-message">
                {gettext('No time-based data available')}
              </div>
            )}
          </div>
        </div>

        <div className="chart-container summary-chart-container">
          <div className="chart-header">
            <h4>{gettext('Library')}</h4>
          </div>
          <SummaryCards
            totalFiles={statisticsData.totalFiles}
            totalCollaborators={statisticsData.totalCollaborators}
          />
        </div>
      </div>
    </div>
  );
};

export default Statistics;
