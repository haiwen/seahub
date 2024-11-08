import React, { useRef, useEffect, useCallback } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import PropTypes from 'prop-types';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { VIEW_TYPE, VIEW_TYPE_ICON } from '../../../../constants';

import '../index.css';

const VIEW_OPTIONS = [
  {
    key: 'table',
    type: VIEW_TYPE.TABLE,
  },
  {
    key: 'gallery',
    type: VIEW_TYPE.GALLERY,
  },
  {
    key: 'kanban',
    type: VIEW_TYPE.KANBAN,
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
      case VIEW_TYPE.KANBAN:
        return gettext('Kanban');
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
                  <Icon symbol={VIEW_TYPE_ICON[item.type] || 'table'} className='metadata-view-icon' />
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
