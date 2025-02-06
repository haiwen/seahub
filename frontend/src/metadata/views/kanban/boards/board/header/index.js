import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../../../../../components/cell-formatter';
import { gettext } from '../../../../../../utils/constants';
import OpMenu from './op-menu';
import { CellType } from '../../../../../constants';

import './index.css';

const Header = ({ readonly, haveFreezed, value, groupByColumn, cardsQuantity, onDelete, onFreezed, onUnFreezed, isCollapsed, onCollapse }) => {
  const [active, setActive] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (haveFreezed) return;
    setActive(true);
  }, [haveFreezed]);

  const onMouseLeave = useCallback(() => {
    if (haveFreezed) return;
    setActive(false);
  }, [haveFreezed]);

  const handelUnFreezed = useCallback((keepActive) => {
    onUnFreezed();
    !keepActive && setActive(false);
  }, [onUnFreezed]);

  const titleValue = useMemo(() => {
    if (!value || !groupByColumn) return null;
    if (groupByColumn.type === CellType.COLLABORATOR) return [value];
    return value;
  }, [value, groupByColumn]);

  return (
    <div className="sf-metadata-view-kanban-board-header" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="sf-metadata-view-kanban-board-header-title">
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
          <div className="board-collapse-btn" title={isCollapsed ? gettext('Expand') : gettext('Collapse')} onClick={onCollapse}>
            <i className={`sf3-font sf3-font-down ${isCollapsed ? 'rotate-90' : ''}`}></i>
          </div>
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
