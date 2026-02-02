import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CustomIcon from '../../pages/wiki2/custom-icon';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
import { Utils } from '../../utils/utils';

import './wiki2-search-result.css';

function Wiki2SearchResult({ index, result, onItemClick, getCurrentPageId, setRef, highlightIndex, onHighlightIdx }) {
  const { content, page, title } = result;
  const isCurrentPage = getCurrentPageId && getCurrentPageId() === result.page?.id;
  const isHighlighted = highlightIndex === index;
  const key = result._id || result.doc_uuid;

  const onMouseEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onHighlightIdx(index);
  }, [index, onHighlightIdx]);

  return (
    <li
      key={key}
      className={classNames('wiki2-search-result-item', { 'wiki2-search-result-item-highlight': isHighlighted })}
      onClick={(e) => onItemClick(e, result)}
      ref={ref => setRef(ref)}
      tabIndex={0}
      role="option"
      aria-selected={isHighlighted}
      onKeyDown={Utils.onKeyDown}
      onMouseEnter={onMouseEnter}
    >
      <div className="wiki2-search-result-icon">
        {result.page?.icon ? <CustomIcon icon={page.icon} /> : <Icon symbol="wiki-file" />}
      </div>

      <div className="wiki2-search-result-content">
        <div className="wiki2-search-result-title text-truncate" title={title}>
          {title ? <div dangerouslySetInnerHTML={{ __html: title }}></div> : (page && page.name || gettext('Untitled'))}
          {isCurrentPage && (
            <div className="wiki2-search-result-current">{gettext('Current page')}</div>
          )}
        </div>

        {!page && ( // Don't show path when current page is searched, as it's meaningless
          <div className="wiki2-search-result-path text-truncate">
            {result.wiki_name ? (
              <span title={result.wiki_name}>
                {result.wiki_name} / <span dangerouslySetInnerHTML={{ __html: result.title }}></span>
              </span>
            ) : ''}
          </div>
        )}
        {content && (
          <div className='wiki2-search-result-summary'>
            <p className="m-0" dangerouslySetInnerHTML={{ __html: content }} ></p>
          </div>
        )}
      </div>
    </li>
  );
}

Wiki2SearchResult.propTypes = {
  index: PropTypes.number.isRequired,
  result: PropTypes.object.isRequired,
  highlightIndex: PropTypes.number.isRequired,
  onHighlightIdx: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  setRef: PropTypes.func.isRequired,
  currentPageId: PropTypes.string,
};

export default Wiki2SearchResult;
