import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import CenteredLoading from '@/components/centered-loading';
import Icon from '@/components/icon';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext } from '@/utils/constants';
import { formatWithTimezone } from '@/utils/time';
import { Utils } from '@/utils/utils';
import metadataAPI from '../../../api';

const STATUS_QUERY_INTERVAL = 5000;

const getStatusIcon = (status) => {
  if (status === 'completed') return 'check-circle';
  if (status === 'failed') return 'exclamation-circle';
  if (status === 'pending') return 'time';
  return 'spinner';
};

const getStatusText = (status) => {
  if (status === 'completed') return gettext('Completed');
  if (status === 'failed') return gettext('Failed');
  if (status === 'crawling') return gettext('Crawling');
  return gettext('Pending');
};

const getFilesText = (count) => count === 1 ? gettext('file') : gettext('files');

const isCompleted = (status) => ['completed', 'failed'].includes(status);

const isProcessingCompleted = (statusData) => {
  if (!isCompleted(statusData.summary?.status)) return false;
  return !statusData.index_enabled || isCompleted(statusData.index?.status);
};

const StatusDialog = ({ repoID, toggle }) => {
  const [statusData, setStatusData] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    let pollingTimer = null;

    const queryStatus = () => {
      metadataAPI.getAISummaryStatus(repoID).then((res) => {
        if (!isMounted) return;
        setStatusData(res.data);
        setErrorMsg('');
        setLoading(false);
        if (!isProcessingCompleted(res.data)) {
          pollingTimer = setTimeout(queryStatus, STATUS_QUERY_INTERVAL);
        }
      }).catch((error) => {
        if (!isMounted) return;
        setErrorMsg(Utils.getErrorMsg(error));
        setLoading(false);
      });
    };

    queryStatus();

    return () => {
      isMounted = false;
      clearTimeout(pollingTimer);
    };
  }, [repoID]);

  const statusItems = [
    {
      key: 'summary',
      title: gettext('AI Summary'),
      status: errorMsg ? 'failed' : statusData?.summary?.status || 'pending',
      label: gettext('Processed') + ': ' + (statusData?.summary?.processed_count || 0) + ' ' + getFilesText(statusData?.summary?.processed_count || 0),
    },
  ];
  if (statusData?.index_enabled) {
    statusItems.push({
      key: 'index',
      title: gettext('Index'),
      status: errorMsg ? 'failed' : statusData.index?.status || 'pending',
      label: gettext('Indexed') + ': ' + (statusData.index?.indexed_count || 0) + ' ' + getFilesText(statusData.index?.indexed_count || 0),
    });
  }

  const latestIndexTime = statusData?.latest_index_time;

  return (
    <Modal isOpen={true} toggle={toggle} className="ai-summary-status-dialog">
      <SeahubModalHeader toggle={toggle}>{gettext('AI Chat and Search status')}</SeahubModalHeader>
      <ModalBody>
        {isLoading ? (
          <CenteredLoading />
        ) : (
          <div className="ai-summary-status-container">
            {errorMsg && <p className="error">{errorMsg}</p>}
            <div className="status-header">
              <p>{gettext('Total files')}: {statusData?.total_files || 0}</p>
              {latestIndexTime && (
                <p title={formatWithTimezone(latestIndexTime)}>
                  {gettext('Latest index time') + ': ' + dayjs(latestIndexTime).format('YYYY-MM-DD HH:mm:ss')}
                </p>
              )}
            </div>
            <div className="timeline">
              {statusItems.map(item => (
                <div className="timeline-item" key={item.key}>
                  <div
                    className="timeline-icon"
                    role="img"
                    aria-label={getStatusText(item.status)}
                    title={getStatusText(item.status)}
                  >
                    <Icon symbol={getStatusIcon(item.status)} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-title">{item.title}</div>
                    <div className="timeline-stats">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={toggle} color="secondary">{gettext('Close')}</Button>
      </ModalFooter>
    </Modal>
  );
};

StatusDialog.propTypes = {
  repoID: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
};

export default StatusDialog;
