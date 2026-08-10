import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';
import Switch from '../../../../components/switch';
import OpIcon from '../../../../components/op-icon';
import toaster from '../../../../components/toast';
import TurnOffConfirmDialog from '../turn-off-confirm-dialog';

import './index.css';

const MetadataFaceRecognitionDialog = ({ value: oldValue, repoID, submit, enableMetadata }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);
  const [showTurnOffConfirmDialog, setShowTurnOffConfirmDialog] = useState(false);

  const onSubmit = useCallback((nextValue) => {
    if (!nextValue) {
      setShowTurnOffConfirmDialog(true);
      return;
    }
    setSubmitting(true);
    metadataAPI.openFaceRecognition(repoID).then(res => {
      setSubmitting(false);
      submit(true);
      setValue(true);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, submit]);

  const turnOffConfirmToggle = useCallback(() => {
    setShowTurnOffConfirmDialog(!showTurnOffConfirmDialog);
  }, [showTurnOffConfirmDialog]);

  const turnOffConfirmSubmit = useCallback(() => {
    setShowTurnOffConfirmDialog(false);
    setSubmitting(true);
    metadataAPI.closeFaceRecognition(repoID).then(res => {
      setSubmitting(false);
      submit(false);
      setValue(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [repoID, submit]);

  const onValueChange = useCallback(() => {
    const nextValue = !value;
    const submitDisabled = oldValue === nextValue || submitting || !enableMetadata;
    if (!submitDisabled) {
      onSubmit(nextValue);
    }
  }, [value, onSubmit, oldValue, submitting, enableMetadata]);

  useEffect(() => {
    if (value && !enableMetadata) {
      setValue(false);
    }
  }, [value, enableMetadata]);

  return (
    <div className='library-setting-item'>
      <h3 className='library-setting-item-heading'>{gettext('Face recognition')}</h3>
      <>
        <div className='d-flex align-items-center'>
          <Switch
            checked={value}
            disabled={submitting || !enableMetadata}
            size="large"
            textPosition="right"
            className="change-face-recognition-status-management"
            onChange={onValueChange}
            placeholder={gettext('Face recognition')}
          />
          {!enableMetadata &&
            <OpIcon
              id="face-rec-help-icon"
              className="ml-1 position-relative help-icon"
              symbol="question-circle-stroked"
              tooltip={gettext('Please turn on extended properties setting first')}
              placement='right'
            />
          }
        </div>
        <p className="setting-tip">
          {gettext('Enable face recognition to identify people in your photos.')}
        </p>
      </>
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog
          title={gettext('Turn off face recognition')}
          toggle={turnOffConfirmToggle}
          submit={turnOffConfirmSubmit}
        >
          <p>{gettext('Do you really want to turn off face recognition? Existing results will all be deleted.')}</p>
        </TurnOffConfirmDialog>
      )}
    </div>
  );
};

MetadataFaceRecognitionDialog.propTypes = {
  value: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  submit: PropTypes.func.isRequired,
  enableMetadata: PropTypes.bool.isRequired,
};

export default MetadataFaceRecognitionDialog;
