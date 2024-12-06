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
import { SeahubSelect } from '../../../../components/common/select';

import './index.css';

const langOptions = [
  {
    value: 'zh-cn',
    label: '简体中文'
  },
  {
    value: 'en',
    label: 'English'
  }
];

const MetadataTagsStatusDialog = ({ value: oldValue, lang: oldLang, repoID, toggleDialog: toggle, submit }) => {
  const [value, setValue] = useState(oldValue);
  const [lang, setLang] = useState({ value: oldLang || 'en', label: langOptions.find(item => item.value === oldLang).label });
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
    tagsAPI.openTags(repoID, lang.value).then(res => {
      submit(true, lang.value);
      toggle();
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setSubmitting(false);
    });
  }, [lang, repoID, submit, toggle, value]);

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

  const onSelectChange = (option) => {
    setLang(option);
  };

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
              {gettext('Enable tags to add tags to files and search files by tags.')}
            </p>
            {value && (
              <div className="tags-language-container">
                <span>{gettext('Tags language:')}</span>
                <SeahubSelect
                  className='tags-language-selector'
                  value={lang || { value: 'en', label: 'English' }}
                  options={langOptions}
                  onChange={onSelectChange}
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={onToggle}>{gettext('Cancel')}</Button>
            <Button color="primary" disabled={(oldValue === value && oldLang === lang.value) || submitting} onClick={onSubmit}>{gettext('Submit')}</Button>
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
