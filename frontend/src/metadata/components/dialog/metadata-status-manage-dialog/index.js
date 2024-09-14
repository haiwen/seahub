import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import Switch from '../../../../components/common/switch';
import toaster from '../../../../components/toast';
import TurnOffConfirmDialog from './turn-off-confirm';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';

import './index.css';

const MetadataStatusManagementDialog = ({ value: oldValue, repoID, toggle, submit }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);
  const [showTurnOffConfirmDialog, setShowTurnOffConfirmDialog] = useState(false);

  const onToggle = useCallback(() => {
    if (submitting) return;
    toggle && toggle();
  }, [submitting, toggle]);

  const onSubmit = useCallback(() => {
    if (!value) {
      setShowTurnOffConfirmDialog(true);
      return;
    }
    setSubmitting(true);
    metadataAPI.createMetadata(repoID).then(res => {
      submit(true);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, value, submit, toggle]);

  const turnOffConfirmToggle = useCallback(() => {
    setShowTurnOffConfirmDialog(!showTurnOffConfirmDialog);
  }, [showTurnOffConfirmDialog]);

  const turnOffConfirmSubmit = useCallback(() => {
    setShowTurnOffConfirmDialog(false);
    setSubmitting(true);
    metadataAPI.deleteMetadata(repoID).then(res => {
      submit(false);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, submit, toggle]);

  const onValueChange = useCallback(() => {
    const nextValue = !value;
    setValue(nextValue);
  }, [value]);

  return (
    <>
      {!showTurnOffConfirmDialog && (
        <Modal className="metadata-status-management-dialog" isOpen={true} toggle={onToggle}>
          <ModalHeader toggle={onToggle}>{gettext('Extended properties management')}</ModalHeader>
          <ModalBody>
            <Switch
              checked={value}
              disabled={submitting}
              size="large"
              textPosition="right"
              className={classnames('change-metadata-status-management w-100', { 'disabled': submitting })}
              onChange={onValueChange}
              placeholder={gettext('Enable extended properties')}
            />
            <div className="tip">
              {gettext('After enable extended properties for files, you can add different properties to files, like collaborators, file expiring time, file description. You can also create different views for files based extended properties.')}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
            <Button color="primary" disabled={oldValue === value || submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
          </ModalFooter>
        </Modal>
      )}
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog toggle={turnOffConfirmToggle} submit={turnOffConfirmSubmit} />
      )}
    </>
  );
};

MetadataStatusManagementDialog.propTypes = {
  value: PropTypes.bool,
  repoID: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

export default MetadataStatusManagementDialog;
