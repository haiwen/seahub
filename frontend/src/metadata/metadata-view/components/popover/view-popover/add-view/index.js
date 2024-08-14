import React, { useRef, useEffect, useCallback } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils';
import Icon from '../../../../../../components/icon';

import '../index.css';

const AddView = ({ target, toggle, onOptionClick }) => {
  const popoverRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target)) {
      toggle(event);
    }
  }, [toggle]);

  useEffect(() => {
    if (popoverRef.current) {
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [handleClickOutside]);

  return (
    <UncontrolledPopover
      className='sf-metadata-addview-popover'
      isOpen={true}
      toggle={toggle}
      target={target}
      placement='right-start'
      hideArrow={true}
      fade={false}
      boundariesElement={document.body}
    >
      <div ref={popoverRef}>
        <div className='sf-metadata-addview-popover-header'>{gettext('New view')}</div>
        <div className='sf-metadata-addview-popover-body'>
          <button className='dropdown-item sf-metadata-addview-popover-item' onClick={onOptionClick}>
            <div className="left-icon">
              <div className="metadata-view-icon">
                <Icon symbol="table" />
              </div>
            </div>
            <div>{gettext('Table')}</div>
          </button>
        </div>
      </div>
    </UncontrolledPopover>
  );
};

AddView.propTypes = {
  target: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  onOptionClick: PropTypes.func.isRequired,
};

export default AddView;
