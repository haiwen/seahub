import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import PropTypes from 'prop-types';
import metadataAPI from '@/api/metadata-api';
import Loading from '@/components/loading';
import SeahubModalHeader from '@/components/seahub-modal-header';
import toaster from '@/components/toast';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './index.css';

const POLL_INTERVAL = 1000;

const getDownloadFilename = (contentDisposition) => {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) return decodeURIComponent(encoded[1]);
  const filename = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return filename ? filename[1] : 'metadata-backup.xlsx';
};

const MetadataBackupPanel = ({ repoID, enableMetadata }) => {
  const [operation, setOperation] = useState(null);
  const [preview, setPreview] = useState(null);
  const [taskID, setTaskID] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const pollTask = (id, expectedStatus, onComplete) => {
    if (!isMountedRef.current) return;
    metadataAPI.getMetadataBackupTask(repoID, id).then(response => {
      if (!isMountedRef.current) return;
      const task = response.data;
      if (task.status === 'error') {
        setOperation(null);
        toaster.danger(task.error || gettext('Metadata backup operation failed.'));
        return;
      }
      if (task.status === expectedStatus) {
        onComplete(task);
        return;
      }
      timerRef.current = setTimeout(() => pollTask(id, expectedStatus, onComplete), POLL_INTERVAL);
    }).catch(error => {
      if (!isMountedRef.current) return;
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const exportBackup = () => {
    setOperation('export');
    metadataAPI.exportMetadataBackup(repoID).then(response => {
      if (!isMountedRef.current) return;
      const id = response.data.task_id;
      pollTask(id, 'success', () => {
        metadataAPI.downloadMetadataBackup(repoID, id).then(download => {
          if (!isMountedRef.current) return;
          const url = window.URL.createObjectURL(download.data);
          const link = document.createElement('a');
          link.href = url;
          link.download = getDownloadFilename(download.headers['content-disposition']);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setOperation(null);
          toaster.success(gettext('Metadata backup exported.'));
        }).catch(error => {
          if (!isMountedRef.current) return;
          setOperation(null);
          toaster.danger(Utils.getErrorMsg(error));
        });
      });
    }).catch(error => {
      if (!isMountedRef.current) return;
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const selectBackup = (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setOperation('preview');
    metadataAPI.importMetadataBackup(repoID, file).then(response => {
      if (!isMountedRef.current) return;
      const id = response.data.task_id;
      pollTask(id, 'ready', task => {
        setTaskID(id);
        setPreview(task.result);
        setOperation(null);
      });
    }).catch(error => {
      if (!isMountedRef.current) return;
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const restoreBackup = () => {
    setPreview(null);
    setOperation('restore');
    metadataAPI.restoreMetadataBackup(repoID, taskID).then(() => {
      if (!isMountedRef.current) return;
      pollTask(taskID, 'success', () => {
        setOperation(null);
        setTaskID(null);
        toaster.success(gettext('Metadata restored successfully.'));
        window.location.reload();
      });
    }).catch(error => {
      if (!isMountedRef.current) return;
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const busy = operation !== null;

  return (
    <div className="library-setting-item metadata-backup-panel">
      <h3 className="library-setting-item-heading">{gettext('Backup and restore')}</h3>
      <p className="setting-tip mb-3">
        {gettext('Export metadata to an Excel backup, or restore metadata from a backup exported by Seafile.')}
      </p>
      <div className="d-flex align-items-center">
        <Button className="metadata-backup-panel__button d-inline-flex align-items-center" color="secondary" disabled={busy || !enableMetadata} onClick={exportBackup}>
          {operation === 'export' && <Loading className="metadata-backup-panel__loading" />}
          {gettext('Export backup')}
        </Button>
        <Button className="metadata-backup-panel__button d-inline-flex align-items-center ml-2" color="secondary" disabled={busy || !enableMetadata} onClick={() => inputRef.current.click()}>
          {(operation === 'preview' || operation === 'restore') && <Loading className="metadata-backup-panel__loading" />}
          {gettext('Import backup')}
        </Button>
        <input ref={inputRef} type="file" accept=".xlsx" className="d-none" onChange={selectBackup} />
      </div>
      {!enableMetadata && (
        <p className="setting-tip">{gettext('Turn on extended properties before backing up or restoring metadata.')}</p>
      )}
      {preview && (
        <Modal isOpen={true} toggle={() => setPreview(null)} className="metadata-backup-import">
          <SeahubModalHeader toggle={() => setPreview(null)}>{gettext('Import metadata backup')}</SeahubModalHeader>
          <ModalBody className="metadata-backup-import__body">
            <p>{gettext('This import will replace all existing metadata in this library.')}</p>
            <table className="metadata-backup-import__summary">
              <thead>
                <tr>
                  <th scope="col">{gettext('Item')}</th>
                  <th scope="col">{gettext('Count')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{gettext('Metadata records')}</td>
                  <td>{preview.metadata_rows}</td>
                </tr>
                <tr>
                  <td>{gettext('Metadata columns')}</td>
                  <td>{preview.columns}</td>
                </tr>
                <tr>
                  <td>{gettext('Tags')}</td>
                  <td>{preview.tags}</td>
                </tr>
              </tbody>
            </table>
            <p className="metadata-backup-import__tip">
              {gettext('Export a metadata backup first if you may need to undo this operation.')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setPreview(null)}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={restoreBackup}>{gettext('Replace metadata')}</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

MetadataBackupPanel.propTypes = {
  repoID: PropTypes.string.isRequired,
  enableMetadata: PropTypes.bool.isRequired,
};

export default MetadataBackupPanel;
