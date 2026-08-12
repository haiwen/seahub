import React, { useCallback, useMemo } from 'react';
import classNames from 'classnames';
import Icon from '../../../../icon';
import { gettext, siteRoot } from '../../../../../utils/constants';

import './index.css';

const FILE_URL_PREFIX = 'file:///seafile-ai/';

const CustomizeLink = ({
  element,
  isShowPopover,
  onLinkClick,
  onHrefClick,
  attributes,
  children,
  mdFiles = [],
  openDocument,
  repoID,
}) => {
  const file = useMemo(() => {
    if (!Array.isArray(mdFiles) || mdFiles.length === 0) {
      return null;
    }
    return mdFiles.find((item) => item.url === element.url) || null;
  }, [element.url, mdFiles]);

  const handleOpenDocument = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    if (!file || !openDocument) {
      return;
    }
    openDocument(file);
  }, [file, openDocument]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    handleOpenDocument(event);
  }, [handleOpenDocument]);

  const isLibraryFile = repoID && element.url.startsWith(`${siteRoot}lib/${repoID}/file/`);

  if (isLibraryFile) {
    return (
      <span
        data-url={element.url}
        className="sf-virtual-link"
        {...attributes}
      >
        <a href={element.url} target="_blank" rel="noopener noreferrer">{children}</a>
      </span>
    );
  }

  if (!element.url.startsWith(FILE_URL_PREFIX) || !file) {
    return (
      <span
        onClick={onLinkClick}
        data-url={element.url}
        className={classNames('sf-virtual-link', { selected: isShowPopover })}
        {...attributes}
      >
        <a href={element.url} onClick={onHrefClick}>{children}</a>
      </span>
    );
  }

  return (
    <div
      className="sea-ai-chat-customize-link"
      onClick={handleOpenDocument}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="sea-ai-chat-customize-link-header">
        <div className="sea-ai-chat-customize-link-name o-hidden">
          <Icon symbol="ai-file" className="flex-shrink-0" />
          <span className="text-truncate">{file.name}</span>
        </div>
        <button
          type="button"
          className="sea-ai-chat-customize-link-view-btn"
          onClick={handleOpenDocument}
          title={gettext('View file')}
          aria-label={gettext('View file')}
        >
          <Icon symbol="view-issue" />
        </button>
      </div>
    </div>
  );
};

export default CustomizeLink;
