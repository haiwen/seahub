import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import Icon from '../../../components/icon';

function WikiLeftBarIcon(props) {
  const [open, setOpen] = useState(false);
  const inputEl = useRef(null);

  function onMouseEnter() {
    if (inputEl && inputEl.current) {
      inputEl.current.style.backgroundColor = '#dedede';
    }
  }

  function onMouseLeave() {
    if (inputEl && inputEl.current) {
      inputEl.current.style.backgroundColor = '';
    }
  }

  return (
    <>
      <div
        className="left-bar-button"
        ref={inputEl}
        onClick={props.onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Icon symbol={props.iconClass}/>
      </div>
      <Tooltip
        placement="right"
        isOpen={open}
        target={inputEl}
        toggle={() => setOpen(!open)}
        hideArrow={true}
        fade={false}
      >
        {props.tipText}
      </Tooltip>
    </>
  );
}

WikiLeftBarIcon.propTypes = {
  onClick: PropTypes.func.isRequired,
  iconClass: PropTypes.string.isRequired,
  tipText: PropTypes.string.isRequired,
};

export default WikiLeftBarIcon;
