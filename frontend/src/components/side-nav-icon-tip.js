import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import '../css/side-nav-icon-tip.css';

function SideNavIconTip(props) {

  const [showTooltip, setShowTooltip] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const toggleTooltip = useCallback(() => {
    if (!showTooltip) {
      setShowTooltip(true);
      setTimeout(() => {
        setShowAnimation(true);
      }, 10);
    } else {
      setShowTooltip(false);
      setShowAnimation(false);
    }
  }, [showTooltip]);

  return (
    <Tooltip
      innerClassName={showAnimation ? 'side-nav-icon-tip side-nav-icon-tip-animation' : 'side-nav-icon-tip'}
      toggle={toggleTooltip}
      hideArrow={true}
      delay={{show: 0, hide: 0}}
      target={props.target}
      placement="right"
      isOpen={showTooltip}
    >
      {props.text}
    </Tooltip>
  );
}

SideNavIconTip.propTypes = {
  text: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
};

export default SideNavIconTip;
