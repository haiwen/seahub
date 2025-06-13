import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getPreviewContent } from '@seafile/seafile-editor';
import Icon from '../../../../components/icon';
import ModalPortal from '../../../../components/modal-portal';
import LongTextPreview from './long-text-preview';

import './index.css';

const LongTextFormatter = ({ value: oldValue, className, previewClassName, textNeedSlice = true, children: emptyFormatter }) => {
  const [isPreview, setPreview] = useState(false);

  const ref = useRef(null);
  const targetStyle = useRef({});
  const openPreviewTimer = useRef(null);
  const closePreviewTimer = useRef(null);

  const value = useMemo(() => {
    if (!oldValue) return null;
    const valueType = typeof oldValue;
    if (valueType === 'object') return oldValue;
    if (valueType === 'string') {
      const isMarkdown = true;
      const { previewText, images, links, checklist } = getPreviewContent(oldValue, isMarkdown, textNeedSlice);
      return { text: oldValue, preview: previewText, images: images, links: links, checklist };
    }
    return null;
  }, [oldValue, textNeedSlice]);

  useEffect(() => {
    return () => {
      openPreviewTimer.current && clearTimeout(openPreviewTimer.current);
      closePreviewTimer.current && clearTimeout(closePreviewTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderLinks = useCallback(() => {
    if (!value) return null;
    const links = value.links;
    if (!Array.isArray(links) || links.length === 0) return null;
    return (
      <span className="sf-metadata-long-text-links">
        <Icon symbol="url" />
        {links.length}
      </span>
    );
  }, [value]);

  const renderCheckList = useCallback(() => {
    if (!value) return null;
    const checkList = value.checklist;
    if (!checkList || checkList.total === 0) return null;
    return (
      <span className={classnames('sf-metadata-long-text-check-list', { 'completed': checkList.completed === checkList.total })}>
        <Icon symbol="check-square-solid" />
        {`${checkList.completed}/${checkList.total}`}
      </span>
    );
  }, [value]);

  const renderImages = useCallback(() => {
    if (!value) return null;
    const images = value.images;
    if (!Array.isArray(images) || images.length === 0) return null;
    return (
      <span className="sf-metadata-long-text-images">
        <img src={images[0]} alt=""/>
        <i className="sf-metadata-image-number">{images.length > 1 ? '+' + images.length : null}</i>
      </span>
    );
  }, [value]);

  const renderContent = useCallback(() => {
    if (!value) return null;
    return value.preview;
  }, [value]);

  const onMouseEnter = useCallback(() => {
    // in case that there is no `modal-wrapper`
    if (!document.getElementById('modal-wrapper')) return;
    openPreviewTimer.current && clearTimeout(openPreviewTimer.current);
    openPreviewTimer.current = null;
    if (!value) return;
    if (isPreview) {
      closePreviewTimer.current && clearTimeout(closePreviewTimer.current);
      closePreviewTimer.current = null;
      return;
    }
    openPreviewTimer.current = setTimeout(() => {
      targetStyle.current = ref.current ? ref.current.getBoundingClientRect() : {};
      setPreview(true);
    }, 2000);
  }, [isPreview, value, openPreviewTimer]);

  const onMouseLeave = useCallback(() => {
    openPreviewTimer.current && clearTimeout(openPreviewTimer.current);
    openPreviewTimer.current = null;
    closePreviewTimer.current = setTimeout(() => {
      if (!isPreview) return;
      setPreview(false);
    }, 2000);
  }, [isPreview, openPreviewTimer]);

  const onPreviewMouseEnter = useCallback(() => {
    closePreviewTimer.current && clearTimeout(closePreviewTimer.current);
    closePreviewTimer.current = null;
  }, [closePreviewTimer]);

  const onPreviewMouseLeave = useCallback(() => {
    if (!isPreview) return;
    setPreview(false);
  }, [isPreview]);

  if (!value) return emptyFormatter || null;

  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container long-text-formatter', className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={ref}
    >
      {renderLinks()}
      {renderCheckList()}
      {renderImages()}
      {renderContent()}
      {isPreview &&
        <ModalPortal>
          <LongTextPreview
            className={previewClassName}
            value={value}
            targetStyle={targetStyle.current}
            onMouseEnter={onPreviewMouseEnter}
            onMouseLeave={onPreviewMouseLeave}
          />
        </ModalPortal>
      }
    </div>
  );
};

LongTextFormatter.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  className: PropTypes.string,
  previewClassName: PropTypes.string,
  children: PropTypes.any,
};

export default LongTextFormatter;
