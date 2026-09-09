import React, { useCallback, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import CustomizePopover from '../../../../../customize-popover';
import Icon from '../../../../../icon';
import Definition from '../definition';

import './index.css';

const INIT_DEFINITION_INDEX = 4;

const MoreDefinition = ({ sources, onOpen }) => {
  const [isShowMore, setIsShowMore] = useState(false);
  const [definitionIndex, setDefinitionIndex] = useState(INIT_DEFINITION_INDEX);
  const [popoverWidth, setPopoverWidth] = useState(undefined);
  const moreRef = useRef(null);

  const count = useMemo(() => Math.max(0, sources.length - 3), [sources.length]);
  const sourcesCount = useMemo(() => sources.length, [sources.length]);

  const openShowMore = useCallback(() => {
    const siblingWidth = moreRef.current?.previousElementSibling?.getBoundingClientRect()?.width;
    const width = Number.isFinite(siblingWidth) ? `${siblingWidth}px` : undefined;
    setPopoverWidth(width);
    setIsShowMore(true);
  }, []);

  const hideShowMore = useCallback(() => {
    setIsShowMore(false);
    setDefinitionIndex(INIT_DEFINITION_INDEX);
  }, []);

  const moveDefinitionIndex = useCallback((step) => {
    let nextDefinitionIndex = definitionIndex + step;
    if (INIT_DEFINITION_INDEX <= nextDefinitionIndex && nextDefinitionIndex <= sourcesCount) {
      setDefinitionIndex(nextDefinitionIndex);
      return;
    }
    if (nextDefinitionIndex < INIT_DEFINITION_INDEX) {
      nextDefinitionIndex = sourcesCount;
    }
    if (nextDefinitionIndex > sourcesCount) {
      nextDefinitionIndex = INIT_DEFINITION_INDEX;
    }
    setDefinitionIndex(nextDefinitionIndex);
  }, [definitionIndex, sourcesCount]);

  const handleOpen = useCallback((source) => {
    hideShowMore();
    onOpen && onOpen(source);
  }, [hideShowMore, onOpen]);

  return (
    <>
      <div
        className={classNames('sea-ai-chat-customize-definition sea-ai-chat-customize-more-definition')}
        onClick={openShowMore}
        ref={moreRef}
      >
        <span className="more-definition-content">+{count}</span>
      </div>
      {isShowMore && (
        <CustomizePopover
          target={moreRef}
          popoverClassName="sea-ai-chat-customize-definitions-popover"
          placement="bottom-end"
          hidePopover={hideShowMore}
          hidePopoverWithEsc={hideShowMore}
        >
          <div className="sea-ai-chat-customize-definitions-container" style={{ width: popoverWidth }}>
            <div className="sea-ai-chat-customize-definitions-title">
              <button type="button" className="btn btn-icon p-0 sea-ai-chat-customize-definitions-index-btn" onClick={() => moveDefinitionIndex(-1)}>
                <Icon symbol="arrow-left" />
              </button>
              <div className="sea-ai-chat-customize-definitions-index">
                <span>{definitionIndex}</span>
                <span className="sources-count-text">/{sourcesCount}</span>
              </div>
              <button type="button" className="btn btn-icon p-0 sea-ai-chat-customize-definitions-index-btn" onClick={() => moveDefinitionIndex(1)}>
                <Icon symbol="arrow-right" />
              </button>
            </div>
            <Definition
              element={{ id: definitionIndex, identifier: definitionIndex }}
              sources={sources}
              onOpen={handleOpen}
              disableAutoWidth={true}
            />
          </div>
        </CustomizePopover>
      )}
    </>
  );
};

MoreDefinition.propTypes = {
  sources: PropTypes.array,
  onOpen: PropTypes.func,
};

export default MoreDefinition;
