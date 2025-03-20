import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import NavItemIcon from '../common/nav-item-icon';
import CustomIcon from '../custom-icon';
import IconButton from '../../../components/icon-button';
import { gettext } from '../../../utils/constants';
import { getPaths } from '../utils/index';

import './index.css';

function WikiTopNav({ config, currentPageId, setCurrentPage, toggleLockFile }) {
  // handleLockClick
  const { navigation, pages } = config;
  const paths = getPaths(navigation, currentPageId, pages);
  const { canLockUnlockFile, isLocked, lockedByMe } = window.app.pageOptions;
  const handleLockClick = async (pageId) => {
    try {
      // 发送锁定/解锁请求
      const response = await fetch('/api/pages/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: pageId
        })
      });

      if (response.ok) {
        // 处理成功响应
        // 可以更新页面状态或显示提示信息
      }
    } catch (error) {
      // 处理错误
      console.error('Failed to lock/unlock page:', error);
    }
  };
  let showLockUnlockBtn = false;
  let lockUnlockText; let lockUnlockIcon;
  if (canLockUnlockFile) {
    if (!isLocked) {
      showLockUnlockBtn = true;
      lockUnlockText = gettext('Lock');
      lockUnlockIcon = 'lock';
    } else if (lockedByMe) {
      showLockUnlockBtn = true;
      lockUnlockText = gettext('Unlock');
      lockUnlockIcon = 'unlock';
    }
  }
  return (
    <div className="wiki2-top-nav d-flex align-items-center">
      {paths.map((item, index) => {
        return (
          <Fragment key={item.id}>
            <div className='wiki2-top-nav-item d-flex align-items-center' onClick={() => {setCurrentPage(item.id);}}>
              {item.icon ? <CustomIcon icon={item.icon} /> : <NavItemIcon symbol={'file'} disable={true} />}
              <div className="d-flex align-items-center">
                <span className='text-truncate' title={item.name} aria-label={item.name}>{item.name}</span>

              </div>
            </div>
            {index !== paths.length - 1 && <span className="item-split">/</span>}
          </Fragment>

        );
      })}
      {/* <IconButton
          id="lock-unlock-file"
          icon={lockUnlockIcon}
          text={lockUnlockText}
          onClick={toggleLockFile}
        /> */}
    </div>
  );
}

WikiTopNav.propTypes = {
  config: PropTypes.object,
  currentPageId: PropTypes.string,
  setCurrentPage: PropTypes.func.isRequired,
  toggleLockFile: PropTypes.func,
  // handleLockClick: PropTypes.func.isRequired
};


export default WikiTopNav;
