import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';

import './index.css';

const TreeSection = ({ title, children, moreKey, moreOperations, moreOperationClick, className }) => {
  const [showChildren, setShowChildren] = useState(true);
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);

  const validMoreOperations = useMemo(() => {
    if (!Array.isArray(moreOperations) || moreOperations.length === 0) return [];
    return moreOperations.filter(operation => operation.key && operation.value);
  }, [moreOperations]);

  const toggleShowChildren = useCallback(() => {
    setShowChildren(!showChildren);
  }, [showChildren]);

  const onMouseEnter = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseOver = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseLeave = useCallback(() => {
    if (freeze) return;
    setHighlight(false);
  }, [freeze]);

  const freezeItem = useCallback(() => {
    setFreeze(true);
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
    setHighlight(false);
  }, []);

  return (
    <div className={classnames('tree-section', {[className]: className})}>
      <div
        className={classnames('tree-section-header', {'tree-section-header-hover': highlight})}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        <div className="tree-section-header-title">{title}</div>
        <div className="tree-section-header-operations">
          {validMoreOperations.length > 0 && (
            <>
              <div className="tree-section-header-operation tree-section-more-operation">
                <ItemDropdownMenu
                  item={moreKey}
                  toggleClass="sf3-font sf3-font-more"
                  freezeItem={freezeItem}
                  unfreezeItem={unfreezeItem}
                  getMenuList={() => validMoreOperations}
                  onMenuItemClick={moreOperationClick}
                />
              </div>
            </>
          )}
          <div className="tree-section-header-operation" onClick={toggleShowChildren}>
            <i className={`sf3-font sf3-font-down ${showChildren ? '' : 'rotate-90'}`}></i>
          </div>
        </div>
      </div>
      {showChildren && (
        <div className="tree-section-body">
          {children}
        </div>
      )}
    </div>
  );
};

TreeSection.propTypes = {
  title: PropTypes.any.isRequired,
  moreOperations: PropTypes.array,
  children: PropTypes.any,
  moreKey: PropTypes.object,
  moreOperationClick: PropTypes.func,
  className: PropTypes.string,
};

export default TreeSection;
