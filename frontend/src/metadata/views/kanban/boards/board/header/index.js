import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CellFormatter from '../../../../../components/cell-formatter';
import { gettext } from '../../../../../../utils/constants';
import OpMenu from './op-menu';
import { CellType } from '../../../../../constants';

import './index.css';

const Header = ({ readonly, haveFreezed, value, groupByColumn, cardsQuantity, onDelete, onFreezed, onUnFreezed, isCollapsed, onCollapse }) => {
  const [active, setActive] = useState(false);

  const headerRef = useRef();

  const onMouseEnter = useCallback(() => {
    if (haveFreezed) return;
    setActive(true);
  }, [haveFreezed]);

  const onMouseLeave = useCallback(() => {
    if (haveFreezed) return;
    setActive(false);
  }, [haveFreezed]);

  const keepActive = useCallback((event) => {
    return event.target.className?.includes('kanban-header-op-btn') || event.target === headerRef.current;
  }, []);

  const handelUnFreezed = useCallback((event) => {
    onUnFreezed();
    !keepActive(event) && setActive(false);
  }, [onUnFreezed, keepActive]);

  const titleValue = useMemo(() => {
    if (!value || !groupByColumn) return null;
    if (groupByColumn.type === CellType.COLLABORATOR) return [value];
    return value;
  }, [value, groupByColumn]);

  const handleCollapse = useCallback((event) => {
    onCollapse();
    !keepActive(event) && setActive(false);
  }, [onCollapse, keepActive]);

  return (
    <div className="sf-metadata-view-kanban-board-header" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="sf-metadata-view-kanban-board-header-title" ref={headerRef}>
        {value ? (
          <CellFormatter value={titleValue} field={groupByColumn} readonly={true} />
        ) : (
          <span>{gettext('Uncategorized')}</span>
        )}
        <span className="cards-quantity">{cardsQuantity}</span>
      </div>
      {active && (
        <div className="board-header-operation-btn">
          {value && !readonly && <OpMenu onDelete={onDelete} onFreezed={onFreezed} onUnFreezed={handelUnFreezed} />}
          <i
            className={classNames('sf3-font sf3-font-down kanban-header-op-btn kanban-header-collapse-btn', { 'rotate-90': isCollapsed })}
            title={isCollapsed ? gettext('Expand') : gettext('Collapse')}
            onClick={handleCollapse}>
          </i>
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  groupByColumn: PropTypes.object,
  haveFreezed: PropTypes.bool,
  cardsQuantity: PropTypes.number,
  onDelete: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default Header;
