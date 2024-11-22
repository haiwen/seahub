import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ModalBody, ModalFooter, Button } from 'reactstrap';
import classnames from 'classnames';
import Switch from '../../../../components/common/switch';
import { gettext } from '../../../../utils/constants';
import tagsAPI from '../../../../tag/api';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';
import TurnOffConfirmDialog from './turn-off-confirm';

// import './index.css';

const MetadataTagsStatusDialog = ({ value: oldValue, repoID, toggleDialog: toggle, submit }) => {
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
    tagsAPI.openTags(repoID).then(res => {
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
    tagsAPI.closeTags(repoID).then(res => {
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
            <Switch
              checked={value}
              disabled={submitting}
              size="large"
              textPosition="right"
              className={classnames('change-face-recognition-status-management w-100', { 'disabled': submitting || oldValue })}
              onChange={onValueChange}
              placeholder={gettext('Tags')}
            />
            <p className="tip m-0">
              {gettext('Enable tags to describe, categorize and mark files.')}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
            <Button color="primary" disabled={oldValue === value || submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
          </ModalFooter>
        </>
      )}
      {showTurnOffConfirmDialog && (
        <TurnOffConfirmDialog toggle={turnOffConfirmToggle} submit={turnOffConfirmSubmit} />
      )}
    </>
  );
};

MetadataTagsStatusDialog.propTypes = {
  value: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

export default MetadataTagsStatusDialog;
