import { useState, useEffect, useCallback } from 'react';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import metadataAPI from '../../api';

export const useStatisticsData = (repoID) => {
  const [isLoading, setIsLoading] = useState(true);
  const [statisticsData, setStatisticsData] = useState(null);

  const fetchStatisticsData = useCallback(async () => {
    if (!repoID) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await metadataAPI.getStatistics(repoID);

      if (response.data && response.data.summary_stats.total_files !== 0) {
        const transformedData = {
          fileTypeStats: response.data.file_type_stats.map(item => ({
            type: item.type,
            count: item.count
          })),
          timeStats: {
            created: {
              unit: response.data.time_stats.created.unit || 'year',
              data: (response.data.time_stats.created.data || []).map(item => ({
                period: item.period || item.year || item.month || item.day,
                label: item.label || item.year?.toString() || item.period,
                count: item.count
              }))
            },
            modified: {
              unit: response.data.time_stats.modified.unit || 'year',
              data: (response.data.time_stats.modified.data || []).map(item => ({
                period: item.period || item.year || item.month || item.day,
                label: item.label || item.year?.toString() || item.period,
                count: item.count
              }))
            }
          },
          creatorStats: response.data.creator_stats.map(item => ({
            creator: item.creator,
            count: item.count
          })),
          totalFiles: response.data.summary_stats.total_files,
          totalCollaborators: response.data.summary_stats.total_collaborators
        };

        setStatisticsData(transformedData);
      } else {
        setStatisticsData(null);
      }
    } catch (error) {
      toaster.danger(Utils.getErrorMsg(error));
      setStatisticsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [repoID]);

  useEffect(() => {
    fetchStatisticsData();
  }, [fetchStatisticsData]);

  return { isLoading, statisticsData, refetch: fetchStatisticsData };
};
