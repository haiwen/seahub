import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { I18nextProvider } from 'react-i18next';
import { SimpleEditor, getBrowserInfo, LongTextModal, BrowserTip, slateToMdString, MarkdownPreview } from '@seafile/seafile-editor';
import { gettext, lang } from '../../../../utils/constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { Utils } from '../../../../utils/utils';
import i18n from '../../../../_i18n/i18n-seafile-editor';
import Icon from '../../../../components/icon';
import metadataAPI from '../../../api';
import { useMetadataAIOperations } from '../../../../hooks/metadata-ai-operation';

import './index.css';

const OCRResultDialog = ({ repoID, record, onToggle, saveToDescription }) => {
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dialogStyle, setDialogStyle] = useState({});
  const { canModify } = useMetadataAIOperations();

  const ocrResult = useRef(null);

  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const fileName = useMemo(() => getFileNameFromRecord(record), [record]);

  const editorRef = useRef(null);

  const { isValidBrowser, isWindowsWechat } = useMemo(() => {
    return getBrowserInfo(true);
  }, []);

  const onFullScreenToggle = useCallback(() => {
    let containerStyle = {};
    if (!isFullScreen) {
      containerStyle = {
        width: '100%',
        height: '100%',
        top: 0,
        border: 'none'
      };
    }
    setIsFullScreen(!isFullScreen);
    setDialogStyle(containerStyle);
  }, [isFullScreen]);

  const onContainerKeyDown = useCallback((event) => {
    event.stopPropagation();
    if (event.keyCode === 27) {
      event.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  const onSave = useCallback(() => {
    const newContent = editorRef.current?.getSlateValue();
    const value = slateToMdString(newContent);
    saveToDescription(value);
    onToggle();
  }, [saveToDescription, onToggle]);

  useEffect(() => {
    const path = Utils.joinPath(parentDir, fileName);
    metadataAPI.ocr(repoID, path).then(res => {
      const result = res.data?.ocr_result || '';
      ocrResult.current = result.replaceAll('\f', '\n').replaceAll('\n\n', '\n').replaceAll('\n', '\n\n');
      setLoading(false);
    }).catch(error => {
      let errorMessage = gettext('Failed to extract text');
      if (error.status === 429) {
        const err_data = error.response.data;
        errorMessage = gettext(err_data.error_msg);
      }
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', onContainerKeyDown);
    return () => {
      document.removeEventListener('keydown', onContainerKeyDown);
    };
  }, [onContainerKeyDown]);

  return (
    <I18nextProvider i18n={ i18n }>
      <LongTextModal onModalClick={onToggle} containerClass="sf-metadata-ocr-file-dialog">
        <div style={dialogStyle} className="longtext-dialog-container">
          <div className={classnames('longtext-header-container', {
            'longtext-header-container-border': isWindowsWechat,
            'longtext-header-divider': isLoading || errorMessage
          })}>
            <div className="longtext-header">
              <span className="longtext-header-name">{gettext('OCR result')}</span>
              <div className="longtext-header-tool">
                {!isLoading && !errorMessage && canModify && (
                  <span
                    className="longtext-header-tool-item d-flex align-items-center mr-1"
                    title={gettext('Save to description property')}
                    onClick={onSave}
                  >
                    <Icon symbol="save" />
                  </span>
                )}
                <span
                  className={classnames('longtext-header-tool-item mr-1 iconfont icon-full-screen', { 'long-text-full-screen': isFullScreen })}
                  onClick={onFullScreenToggle}
                  title={gettext('Full screen')}
                >
                </span>
                <span
                  className="longtext-header-tool-item iconfont icon-x"
                  onClick={onToggle}
                  title={gettext('Close')}
                >
                </span>
              </div>
            </div>
            {!isValidBrowser && <BrowserTip lang={lang} isWindowsWechat={isWindowsWechat} />}
          </div>
          <div
            onKeyDown={onContainerKeyDown}
            className={classnames('longtext-content-container', { 'longtext-container-scroll': isWindowsWechat })}
          >
            {errorMessage ? (
              <div className="w-100 h-100 d-flex align-items-center justify-content-center error">{errorMessage}</div>
            ) : (
              <>
                {isWindowsWechat ? (
                  <MarkdownPreview isWindowsWechat={isWindowsWechat} value={ocrResult.current} isShowOutline={false} />
                ) : (
                  <SimpleEditor ref={editorRef} isFetching={isLoading} focusEnd={false} value={ocrResult.current} />
                )}
              </>
            )}
          </div>
        </div>
      </LongTextModal>
    </I18nextProvider>
  );
};

OCRResultDialog.propTypes = {
  record: PropTypes.object,
  onToggle: PropTypes.func,
  saveToDescription: PropTypes.func,
};

export default OCRResultDialog;
