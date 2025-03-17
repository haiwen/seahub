import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ModalBody, ModalFooter, Button } from 'reactstrap';
import classnames from 'classnames';
import Switch from '../../../../components/switch';
import { gettext } from '../../../../utils/constants';
import metadataAPI from '../../../api';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';
import TurnOffConfirmDialog from '../turn-off-confirm-dialog';

import './index.css';

const MetadataFaceRecognitionDialog = ({ value: oldValue, repoID, toggleDialog: toggle, submit, enableMetadata }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);
  const [showTurnOffConfirmDialog, setShowTurnOffConfirmDialog] = useState(false);

  const onToggle = useCallback(() => {
    toggle();
  }, [toggle]);

  const onSubmit = useCallback(() => {
    if (!value) {
      setShowTurnOffConfirmDialog(true);
      return;
    }
    setSubmitting(true);
    metadataAPI.openFaceRecognition(repoID).then(res => {
      submit(true);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, submit, toggle, value]);

  const turnOffConfirmToggle = useCallback(() => {
    setShowTurnOffConfirmDialog(!showTurnOffConfirmDialog);
  }, [showTurnOffConfirmDialog]);

  const turnOffConfirmSubmit = useCallback(() => {
    setShowTurnOffConfirmDialog(false);
    setSubmitting(true);
    metadataAPI.closeFaceRecognition(repoID).then(res => {
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
        <>
          <ModalBody className="metadata-face-recognition-dialog">
            {!enableMetadata && <p className="tip">{gettext('Please enable the extended properties setting first')}</p>}
            <Switch
              checked={value}
              disabled={submitting || !enableMetadata}
              size="large"
              textPosition="right"
              className={classnames('change-face-recognition-status-management w-100', { 'disabled': submitting || oldValue })}
              onChange={onValueChange}
              placeholder={gettext('Face recognition')}
            />
            <p className="tip m-0">
              {gettext('Enable face recognition to identify people in your photos.')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
            <Button color="primary" disabled={oldValue === value || submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
          </ModalFooter>
        </>
      )}
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog title={gettext('Turn off face recognition')} toggle={turnOffConfirmToggle} submit={turnOffConfirmSubmit}>
          <p>{gettext('Do you really want to turn off face recognition? Existing results will all be deleted.')}</p>
        </TurnOffConfirmDialog>
      )}
    </>
  );
};

MetadataFaceRecognitionDialog.propTypes = {
  value: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  enableMetadata: PropTypes.bool.isRequired,
};

export default MetadataFaceRecognitionDialog;
