import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext } from '../../../../../utils/constants';

import './index.css';

dayjs.extend(relativeTime);

const stripMarkTags = (content) => (content || '').replace(/<\/?mark>/g, '');

const Definition = ({ element, attributes, sources, onOpen, disableAutoWidth = false }) => {
  const source = useMemo(() => {
    if (!element) return {};
    if (!Array.isArray(sources) || sources.length === 0) return {};
    const identifier = Number(element.identifier);
    return { ...sources[identifier - 1], identifier };
  }, [element, sources]);

  const handleClick = useCallback(() => {
    if (onOpen) {
      onOpen(source);
    }
  }, [onOpen, source]);

  const definitionWidth = useMemo(() => {
    const offsetWidth = sources.length > 3 ? '48px' : '0px';
    return `calc((100% - 16px - ${offsetWidth}) / 3)`;
  }, [sources]);

  if (!element) {
    return null;
  }

  const { identifier, title, content, modified_time: modifiedTime } = source;
  const identifierIndex = identifier - 1;
  const definitionStyle = disableAutoWidth ? undefined : { width: definitionWidth };
  const modifiedTimeText = modifiedTime ? dayjs(modifiedTime < 1000000000000 ? modifiedTime * 1000 : modifiedTime).fromNow() : '';

  return (
    <div
      className={classNames('sea-ai-chat-customize-definition', { 'ml-0': identifierIndex % 3 === 0 })}
      style={definitionStyle}
      onClick={handleClick}
      data-id={element.id}
      {...attributes}
    >
      <div className="sea-ai-chat-customize-definition-simple-info">
        <div className="sea-ai-chat-customize-definition-title-content">
          <div className="sea-ai-chat-customize-definition-title">{title}</div>
        </div>
      </div>
      <div className="sea-ai-chat-customize-definition-content">
        {stripMarkTags(content)}
      </div>
      <div className="sea-ai-chat-customize-definition-content-divider"></div>
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          {modifiedTimeText && (
            <div className="sea-ai-chat-customize-definition-mtime text-truncate">
              {`${gettext('Updated')} ${modifiedTimeText}`}
            </div>
          )}
        </div>
        <div className="sea-ai-chat-customize-definition-order">{identifier}</div>
      </div>
    </div>
  );
};

Definition.propTypes = {
  element: PropTypes.object,
  attributes: PropTypes.object,
  sources: PropTypes.array,
  onOpen: PropTypes.func,
  disableAutoWidth: PropTypes.bool,
};

export default Definition;
