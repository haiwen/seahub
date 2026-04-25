import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../icon';
import SfTooltip from '@/components/tooltip';

import './index.css';

const Header = ({ title, icon, iconSize = 32, onClose, children, component = {} }) => {
  const { closeIcon, showCloseIcon } = component;
  return (
    <div className="detail-header">
      <div className="detail-title dirent-title">
        {showCloseIcon && (
          <div id="details-arrow-close-icon" className="detail-header-close">
            <Icon className="close-button" symbol="arrow-right" />
            <SfTooltip target="details-arrow-close-icon">{gettext('Close')}</SfTooltip>
          </div>
        )}
        {icon && (
          <div className="detail-header-icon-container">
            <img src={icon} width={iconSize} height={iconSize} alt="" />
          </div>
        )}
        <span className="detail-title-name ellipsis" title={title}>{title}</span>
      </div>
      {(children || onClose) && (
        <div className="detail-control-container">
          {children}
          {onClose &&
            <Button id="details-close-icon" className="border-0 p-0 bg-transparent detail-control" onClick={onClose} title={gettext('Close')}>
              {closeIcon ? closeIcon : (
                <>
                  <Icon symbol="close" className="detail-control-icon" />
                  <SfTooltip target="details-close-icon">{gettext('Close')}</SfTooltip>
                </>
              )}
            </Button>
          }
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  iconSize: PropTypes.number,
  component: PropTypes.object,
  children: PropTypes.any,
  onClose: PropTypes.func,
};

export default Header;
