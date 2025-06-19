import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { deserializeHtml, slateToMdString } from '@seafile/seafile-editor';
import isHotkey from 'is-hotkey';
import classnames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { Utils } from '../../../../utils/utils';
import metadataAPI from '../../../api';
import { useMetadataAIOperations } from '../../../../hooks/metadata-ai-operation';
import Loading from '../../../../components/loading';
import { getTarget } from '../../../../utils/dom';
import BodyPortal from '../../../../components/body-portal';
import ClickOutside from '../../../../components/click-outside';

import './index.css';

const OCRResultPopover = ({ repoID, target, record, onToggle, saveToDescription }) => {
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [value, setValue] = useState('');
  const [isMount, setMount] = useState(false);
  const [style, setStyle] = useState({});

  const popoverRef = useRef(null);
  const bodyRef = useRef(null);

  const { canModify } = useMetadataAIOperations();

  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const fileName = useMemo(() => getFileNameFromRecord(record), [record]);
  const element = useMemo(() => {
    let _element = document.createElement('div');
    _element.setAttribute('tabindex', '-1');
    return _element;
  }, []);

  const onSave = useCallback(() => {
    const newContent = slateToMdString(deserializeHtml(value));

    // eslint-disable-next-line no-irregular-whitespace
    // '​': Special line breaks
    // https://symbl.cc/en/200B/
    if (newContent.replaceAll('\n', '').replaceAll('\r', '').replaceAll('​', '').trim()) {
      saveToDescription(newContent);
    }
    onToggle();
  }, [value, saveToDescription, onToggle]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('esc', event)) {
      event.stopPropagation();
      event.preventDefault();
      onToggle();
      return false;
    }
  }, [onToggle]);

  const updateStyle = useCallback(() => {
    const { bottom, top, left } = getTarget(target).getBoundingClientRect();
    const innerHeight = window.innerHeight;
    const innerWidth = window.innerWidth;
    const gap = 5; // gap between target and popover
    const marginTB = 28; // margin top/bottom between screen and popover
    const totalGap = gap + marginTB;
    const popoverWidth = 500;
    // 119: popover header height(48) + popover footer height(71)
    const minPopoverBodyHeight = 160;
    const x = left + popoverWidth > innerWidth ? 16 : innerWidth - left - popoverWidth;
    let y = bottom + gap;
    let popoverHeight = 0;
    if (isLoading || errorMessage || !value) {
      popoverHeight = minPopoverBodyHeight + 119;
    } else {
      const childNode = bodyRef.current.firstChild;
      popoverHeight = Math.max(childNode.scrollHeight, minPopoverBodyHeight) + 119;
    }

    if (top > innerHeight - bottom) {
      if (popoverHeight + totalGap > top) {
        y = 28;
        popoverHeight = top - totalGap;
      } else {
        y = top - popoverHeight - gap;
      }
    } else {
      y = bottom + gap;
      if (popoverHeight + totalGap > innerHeight - bottom) {
        popoverHeight = innerHeight - bottom - totalGap;
      }
    }

    setStyle({
      transform: `translate3d(-${x}px, ${y}px, 0px)`,
      height: popoverHeight,
      inset: '0 0 auto auto'
    });
  }, [isLoading, errorMessage, value, target]);

  useEffect(() => {
    document.body.appendChild(element);
    setMount(true);
    return () => {
      document.body.removeChild(element);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', onHotKey, true);
    window.addEventListener('resize', updateStyle);
    return () => {
      document.removeEventListener('keydown', onHotKey);
      window.removeEventListener('resize', updateStyle);
    };
  }, [onHotKey, updateStyle]);

  useLayoutEffect(() => {
    updateStyle();
  }, [updateStyle]);

  useEffect(() => {
    if (!isMount) return;
    updateStyle();
    const path = Utils.joinPath(parentDir, fileName);
    metadataAPI.ocr(repoID, path).then(res => {
      const result = (res.data?.ocr_result || '').replaceAll('\f', '\n');
      const value = result.replaceAll('\n', '').trim() ? result : '';
      setValue(value);
      setLoading(false);
    }).catch(error => {
      const errorMessage = gettext('Failed to extract text');
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMount]);

  return (
    <BodyPortal node={element}>
      <div className="sf-metadata-ocr-result-popover show">
        <ClickOutside onClickOutside={onToggle}>
          <div className="popover show bs-popover-auto position-absolute" style={style}>
            <div className="popover-inner" ref={popoverRef}>
              <div className="sf-metadata-ocr-result-popover-header">
                <h5>{gettext('OCR result')}</h5>
              </div>
              <div className="sf-metadata-ocr-result-popover-body" ref={bodyRef}>
                {isLoading && (
                  <div className="sf-metadata-ocr-file-loading-container">
                    <Loading />
                    <span className="sf-metadata-ocr-file-loading-tip-text">{gettext('Extracting text, please wait...')}</span>
                  </div>
                )}
                {!isLoading && errorMessage && (
                  <div className="h-100 w-100 d-flex align-items-center justify-content-center p-4 error">{errorMessage}</div>
                )}
                {!isLoading && !errorMessage && (
                  <div className={classnames('sf-metadata-ocr-result-display-container', { 'empty-tip': !value })}>
                    {value || gettext('No text extracted')}
                  </div>
                )}
              </div>
              <div className="sf-metadata-ocr-result-popover-footer">
                <Button color="secondary" className="mr-2" onClick={onToggle}>{gettext('Cancel')}</Button>
                <Button color="primary" disabled={!canModify || isLoading || Boolean(errorMessage) || !value} onClick={onSave}>{gettext('Save to description field')}</Button>
              </div>
            </div>
          </div>
        </ClickOutside>
      </div>
    </BodyPortal>
  );
};

OCRResultPopover.propTypes = {
  repoID: PropTypes.string,
  record: PropTypes.object,
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.node, PropTypes.object]),
  onToggle: PropTypes.func,
  saveToDescription: PropTypes.func,
};

export default OCRResultPopover;
