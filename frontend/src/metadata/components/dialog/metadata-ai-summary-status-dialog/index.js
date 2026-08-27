import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import Switch from '../../../../components/switch';
import toaster from '../../../../components/toast';
import OpIcon from '../../../../components/op-icon';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../constants';
import TurnOffConfirmDialog from '../turn-off-confirm-dialog';

import '../metadata-face-recognition-dialog/index.css';

const MetadataAISummaryStatusDialog = ({ value: oldValue, repoID, submit, enableMetadata }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);
  const [showTurnOffConfirmDialog, setShowTurnOffConfirmDialog] = useState(false);

  const onSubmit = useCallback((nextValue) => {
    if (!nextValue) {
      setShowTurnOffConfirmDialog(true);
      return;
    }
    setSubmitting(true);
    metadataAPI.openAISummary(repoID).then(() => {
      setSubmitting(false);
      submit(true);
      setValue(true);
      window.sfMetadataContext?.eventBus?.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
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
    metadataAPI.closeAISummary(repoID).then(() => {
      setSubmitting(false);
      submit(false);
      setValue(false);
      window.sfMetadataContext?.eventBus?.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
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
      <h3 className='library-setting-item-heading'>{gettext('AI Chat & Search')}</h3>
      <>
        <div className='d-flex align-items-center'>
          <Switch
            checked={value}
            disabled={submitting || !enableMetadata}
            size="large"
            textPosition="right"
            className="change-face-recognition-status-management"
            onChange={onValueChange}
            placeholder={gettext('AI Chat & Search')}
          />
          {!enableMetadata &&
            <OpIcon
              id="tags-help-icon"
              className="ml-1 position-relative help-icon"
              symbol="question-circle-stroked"
              tooltip={gettext('Please turn on extended properties setting first')}
              placement='right'
            />
          }
        </div>
        <p className="setting-tip">
          {gettext('Enable AI summary and AI chat on your files. Your files will be summarized to enable AI to efficiently find your files during chat.')}
        </p>
      </>
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog title={gettext('Turn off AI Chat & Search')} toggle={turnOffConfirmToggle} submit={turnOffConfirmSubmit}>
          <p>{gettext('Do you really want to turn off AI Chat & Search? AI chat and file search will no longer be available, and existing AI summaries will all be deleted.')}</p>
        </TurnOffConfirmDialog>
      )}
    </div>
  );
};

MetadataAISummaryStatusDialog.propTypes = {
  value: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  submit: PropTypes.func.isRequired,
  enableMetadata: PropTypes.bool.isRequired,
};

export default MetadataAISummaryStatusDialog;
