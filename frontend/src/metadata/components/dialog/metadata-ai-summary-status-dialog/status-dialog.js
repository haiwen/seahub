import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import CenteredLoading from '../../../../components/centered-loading';
import SeahubModalHeader from '../../../../components/common/seahub-modal-header';
import Icon from '../../../../components/icon';
import toaster from '../../../../components/toast';
import { formatWithTimezone } from '../../../../utils/time';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import metadataAPI from '../../../api';

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

const StatusDialog = ({ repoID, toggle }) => {
  const [statusData, setStatusData] = useState(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    metadataAPI.getAISummaryStatus(repoID).then((res) => {
      setStatusData(res.data);
      setLoading(false);
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      setLoading(false);
    });
  }, [repoID]);

  const statusItems = statusData ? [
    {
      key: 'summary',
      title: gettext('AI Summary'),
      status: statusData.summary?.status || 'pending',
      label: gettext('Processed') + ': ' + (statusData.summary?.processed_count || 0) + ' ' + getFilesText(statusData.summary?.processed_count || 0),
    },
    {
      key: 'index',
      title: gettext('Index'),
      status: statusData.index?.status || 'pending',
      label: gettext('Indexed') + ': ' + (statusData.index?.indexed_count || 0) + ' ' + getFilesText(statusData.index?.indexed_count || 0),
    },
  ] : [];

  const latestIndexTime = statusData?.latest_index_time;

  return (
    <Modal isOpen={true} toggle={toggle} className="ai-summary-status-dialog">
      <SeahubModalHeader toggle={toggle}>{gettext('AI Chat and Search status')}</SeahubModalHeader>
      <ModalBody>
        {isLoading ? (
          <CenteredLoading />
        ) : !statusData ? (
          <p className="text-secondary mb-0">{gettext('Failed to load status.')}</p>
        ) : (
          <div className="ai-summary-status-container">
            <div className="status-header">
              <p>{gettext('Total files')}: {statusData.total_files || 0}</p>
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
