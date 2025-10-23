import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { TREE_PANEL_SECTION_STATE_KEY } from '../../constants';
import OpIcon from '../../components/op-icon';
import { gettext } from '../../utils/constants';

import './index.css';

const TreeSection = ({ repoID, stateStorageKey, title, children, renderHeaderOperations, className }) => {
  const [showChildren, setShowChildren] = useState(true);
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);

  const storageKey = useMemo(() => `${TREE_PANEL_SECTION_STATE_KEY}_${repoID}`, [repoID]);

  useEffect(() => {
    if (!stateStorageKey) return;
    const stateString = window.localStorage.getItem(storageKey, '{}');
    const state = JSON.parse(stateString) || {};
    const currentValue = state[stateStorageKey] === false ? false : true;
    setShowChildren(currentValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleShowChildren = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const newValue = !showChildren;
    setShowChildren(newValue);
    if (!stateStorageKey) return;
    const stateString = window.localStorage.getItem(storageKey, '{}');
    const stateOldValue = JSON.parse(stateString);
    const newState = { ...stateOldValue, [stateStorageKey]: newValue };
    window.localStorage.setItem(storageKey, JSON.stringify(newState));
  }, [showChildren, storageKey, stateStorageKey]);

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
    setHighlight(true);
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
    setHighlight(false);
  }, []);

  const renderOperations = useCallback(() => {
    if (!renderHeaderOperations) {
      return null;
    }
    return renderHeaderOperations({
      freezeItem,
      unfreezeItem,
    });
  }, [renderHeaderOperations, freezeItem, unfreezeItem]);

  return (
    <div className={classnames('tree-section', className)}>
      <div
        tabIndex="0"
        className={classnames('tree-section-header', { 'tree-section-header-hover': highlight })}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onFocus={onMouseEnter}
      >
        <span className="tree-section-header-title">{title}</span>
        <div className="tree-section-header-operations">
          {renderOperations()}
          <OpIcon
            className={`tree-section-header-operation ${showChildren ? 'rotate-90' : 'rotate-180'}`}
            symbol="right_arrow"
            op={toggleShowChildren}
            title={showChildren ? gettext('Fold') : gettext('Unfold')}
          />
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
  repoID: PropTypes.string,
  stateStorageKey: PropTypes.string,
  title: PropTypes.any.isRequired,
  children: PropTypes.any,
  className: PropTypes.string,
};

export default TreeSection;
