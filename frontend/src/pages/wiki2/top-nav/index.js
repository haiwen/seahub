import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import NavItemIcon from '../common/nav-item-icon';
import CustomIcon from '../custom-icon';
import { gettext, mediaUrl } from '../../../utils/constants';
import { getPaths } from '../utils/index';
import { Utils } from '../../../utils/utils';

import './index.css';

function WikiTopNav({ config, currentPageId, setCurrentPage, currentPageLocked }) {
  const { navigation, pages } = config;
  const paths = getPaths(navigation, currentPageId, pages);

  const lockedImageUrl = `${mediaUrl}img/file-freezed-32.svg`;
  return (
    <div className="wiki2-top-nav d-flex align-items-center">
      {paths.map((item, index) => {
        return (
          <Fragment key={item.id}>
            <div
              role='button'
              tabIndex={0}
              className='wiki2-top-nav-item d-flex align-items-center'
              onClick={() => { setCurrentPage && setCurrentPage(item.id); }}
              onKeyDown={Utils.onKeyDown}
            >
              {item.icon ? <CustomIcon icon={item.icon} /> : <NavItemIcon symbol={'file'} disable={true} />}
              <div className="d-flex align-items-center">
                <span className='text-truncate' title={item.name} aria-label={item.name}>{item.name}</span>
              </div>
            </div>
            {index !== paths.length - 1 && <span className="item-split">/</span>}
          </Fragment>
        );
      })}
      {paths.length > 0 && currentPageLocked && <img className="locked" src={lockedImageUrl} alt={gettext('freezed')} title={gettext('Page is frozen')}/>}
    </div>
  );
}

WikiTopNav.propTypes = {
  config: PropTypes.object,
  currentPageId: PropTypes.string,
  setCurrentPage: PropTypes.func,
  currentPageLocked: PropTypes.bool,
};

export default WikiTopNav;
