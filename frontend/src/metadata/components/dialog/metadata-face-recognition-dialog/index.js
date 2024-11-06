import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ModalBody, ModalFooter, Button } from 'reactstrap';
import classnames from 'classnames';
import Switch from '../../../../components/common/switch';
import { gettext } from '../../../../utils/constants';
import metadataAPI from '../../../api';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';

import './index.css';

const MetadataFaceRecognitionDialog = ({ value: oldValue, repoID, toggleDialog: toggle, submit }) => {
  const [value, setValue] = useState(oldValue);
  const [submitting, setSubmitting] = useState(false);

  const onToggle = useCallback(() => {
    toggle();
  }, [toggle]);

  const onSubmit = useCallback(() => {
    setSubmitting(true);
    metadataAPI.openFaceRecognition(repoID).then(res => {
      submit(true);
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
      <ModalBody className="metadata-face-recognition-dialog">
        <Switch
          checked={value}
          disabled={submitting || oldValue}
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
      {!oldValue && (
        <ModalFooter>
          <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
          <Button color="primary" disabled={oldValue === value || submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      )}
    </>
  );
};

MetadataFaceRecognitionDialog.propTypes = {
  value: PropTypes.bool.isRequired,
  repoID: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

export default MetadataFaceRecognitionDialog;
