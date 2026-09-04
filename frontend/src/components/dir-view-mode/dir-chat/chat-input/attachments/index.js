import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Attachments } from '../../components';
import Icon from '../../../../icon';

import './index.css';

const AttachmentsFormatter = ({ value = [], onRemove }) => {
  const containerRef = useRef(null);
  const [canScrollBefore, setCanScrollBefore] = useState(false);
  const [canScrollAfter, setCanScrollAfter] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollBefore(container.scrollLeft > 0);
    setCanScrollAfter(container.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, value]);

  const scrollAttachments = useCallback((direction) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction * container.clientWidth,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className="sea-ai-chat-attachments-wrapper w-100 px-4 o-hidden position-relative">
      {canScrollBefore && (
        <div className="sea-ai-chat-attachments-scroll-before">
          <button
            type="button"
            className="sea-ai-icon-btn"
            onClick={() => scrollAttachments(-1)}
          >
            <Icon symbol="arrow-left" />
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="sea-ai-chat-attachments-container"
        onScroll={updateScrollState}
      >
        <Attachments className="sea-ai-chat-attachments" attachments={value} onRemove={onRemove} />
      </div>
      {canScrollAfter && (
        <div className="sea-ai-chat-attachments-scroll-after">
          <button
            type="button"
            className="sea-ai-icon-btn"
            onClick={() => scrollAttachments(1)}
          >
            <Icon symbol="sdoc-next-page" />
          </button>
        </div>
      )}
    </div>
  );
};

AttachmentsFormatter.propTypes = {
  value: PropTypes.array,
  onRemove: PropTypes.func,
};

export default AttachmentsFormatter;
