import React, { useRef, useEffect, useCallback } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils';
import Icon from '../../../../../../components/icon';
import { VIEW_TYPE } from '../../../../_basic';

import '../index.css';

const VIEW_OPTIONS = [
  {
    key: 'table',
    type: VIEW_TYPE.TABLE,
  },
  {
    key: 'gallery',
    type: VIEW_TYPE.GALLERY,
  }
];

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

  const translateLabel = useCallback((type) => {
    switch (type) {
      case VIEW_TYPE.TABLE:
        return gettext('Table');
      case VIEW_TYPE.GALLERY:
        return gettext('Gallery');
      default:
        return type;
    }
  }, []);

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
          {VIEW_OPTIONS.map((item, index) => {
            return (
              <button key={index} className='dropdown-item sf-metadata-addview-popover-item' onClick={() => onOptionClick(item)}>
                <div className="left-icon">
                  <Icon symbol={item.type} className='metadata-view-icon' />
                </div>
                <div>{translateLabel(item.type)}</div>
              </button>
            );
          })}
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
