import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import NavItemIcon from '../../pages/wiki2/common/nav-item-icon';
import CustomIcon from '../../pages/wiki2/custom-icon';
import { gettext } from '../../utils/constants';
import Icon from '../icon';
import { Utils } from '../../utils/utils';

import './wiki2-search-result.css';

function Wiki2SearchResult({ result, getCurrentPageId, setCurrentPage, resetToDefault, setRef, isHighlight }) {
  const { content, page, title } = result;
  const currentPageId = getCurrentPageId();
  const isCurrentPage = currentPageId === page.id;
  return (
    <div
      className={classNames('wiki2-search-result', { 'wiki2-search-result-highlight': isHighlight })}
      onClick={() => { setCurrentPage(page.id); resetToDefault(); }}
      ref={ref => setRef(ref)}
      tabIndex={0}
      role="option"
      aria-selected={isHighlight}
      onKeyDown={Utils.onKeyDown}
    >
      <div className='wiki2-search-result-top d-flex align-items-center'>
        {page.icon ? <CustomIcon icon={page.icon} /> : <NavItemIcon symbol={'file'} disable={true} />}
        <span className='wiki2-search-result-page-name text-truncate' title={page.name} style={isCurrentPage ? { width: 'auto' } : { width: 700 }}>
          {title ? <span dangerouslySetInnerHTML={{ __html: title }}></span> : page.name}
        </span>
        {isCurrentPage ?
          <span className='wiki2-search-result-current'>{gettext('Current page')}</span> :
          <span className="wiki2-search-result-enter">
            <Icon symbol="enter" style={isHighlight ? { opacity: 1 } : {}} />
          </span>
        }
      </div>
      {content ?
        <div className='wiki2-search-result-bottom'>
          <p dangerouslySetInnerHTML={{ __html: content }} ></p>
        </div>
        :
        <div className='py-1'></div>
      }
    </div>
  );
}

Wiki2SearchResult.propTypes = {
  result: PropTypes.object.isRequired,
  getCurrentPageId: PropTypes.func.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  resetToDefault: PropTypes.func.isRequired,
  setRef: PropTypes.func.isRequired,
  isHighlight: PropTypes.bool.isRequired,
};

export default Wiki2SearchResult;
