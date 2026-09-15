import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import PropTypes from 'prop-types';
import Loading from '@/components/loading';
import SeahubModalHeader from '@/components/seahub-modal-header';
import toaster from '@/components/toast';
import metadataAPI from '@/features/metadata/api';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

const POLL_INTERVAL = 1000;

const MetadataBackupPanel = ({ repoID, enableMetadata }) => {
  const [operation, setOperation] = useState(null);
  const [preview, setPreview] = useState(null);
  const [taskID, setTaskID] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const pollTask = (id, expectedStatus, onComplete) => {
    metadataAPI.getMetadataBackupTask(repoID, id).then(response => {
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
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const exportBackup = () => {
    setOperation('export');
    metadataAPI.exportMetadataBackup(repoID).then(response => {
      const id = response.data.task_id;
      pollTask(id, 'success', () => {
        metadataAPI.downloadMetadataBackup(repoID, id).then(download => {
          const url = window.URL.createObjectURL(download.data);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'metadata-backup.xlsx';
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setOperation(null);
          toaster.success(gettext('Metadata backup exported.'));
        }).catch(error => {
          setOperation(null);
          toaster.danger(Utils.getErrorMsg(error));
        });
      });
    }).catch(error => {
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
      const id = response.data.task_id;
      pollTask(id, 'ready', task => {
        setTaskID(id);
        setPreview(task.result);
        setOperation(null);
      });
    }).catch(error => {
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const restoreBackup = () => {
    setPreview(null);
    setOperation('restore');
    metadataAPI.restoreMetadataBackup(repoID, taskID).then(() => {
      pollTask(taskID, 'success', () => {
        setOperation(null);
        setTaskID(null);
        toaster.success(gettext('Metadata restored successfully.'));
        window.location.reload();
      });
    }).catch(error => {
      setOperation(null);
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  const busy = operation !== null;

  return (
    <div className="library-setting-item">
      <h3 className="library-setting-item-heading">{gettext('Backup and restore')}</h3>
      <p className="setting-tip mb-3">
        {gettext('Export metadata to an Excel backup, or restore metadata from a backup exported by Seafile.')}
      </p>
      <div className="d-flex align-items-center">
        <Button color="primary" outline={true} disabled={busy || !enableMetadata} onClick={exportBackup}>
          {operation === 'export' && <Loading className="mr-2" />}
          {gettext('Export backup')}
        </Button>
        <Button className="ml-2" color="secondary" disabled={busy || !enableMetadata} onClick={() => inputRef.current.click()}>
          {(operation === 'preview' || operation === 'restore') && <Loading className="mr-2" />}
          {gettext('Import backup')}
        </Button>
        <input ref={inputRef} type="file" accept=".xlsx" className="d-none" onChange={selectBackup} />
      </div>
      <p className="setting-tip text-warning mt-2">
        {gettext('Importing replaces all existing metadata. Before importing, create a library snapshot and export a metadata backup. A snapshot alone does not include metadata.')}
      </p>
      {!enableMetadata && (
        <p className="setting-tip">{gettext('Turn on extended properties before backing up or restoring metadata.')}</p>
      )}
      {preview && (
        <Modal isOpen={true} toggle={() => setPreview(null)}>
          <SeahubModalHeader toggle={() => setPreview(null)}>{gettext('Import metadata backup')}</SeahubModalHeader>
          <ModalBody>
            <p>{gettext('This import will replace all existing metadata in this library.')}</p>
            <p className="mb-1">{gettext('Metadata records')}: {preview.metadata_rows}</p>
            <p className="mb-1">{gettext('Metadata columns')}: {preview.columns}</p>
            <p>{gettext('Tags')}: {preview.tags}</p>
            <p className="text-warning mb-0">
              {gettext('Create a library snapshot and export a metadata backup first if you may need to undo this operation.')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setPreview(null)}>{gettext('Cancel')}</Button>
            <Button color="danger" onClick={restoreBackup}>{gettext('Replace metadata')}</Button>
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
