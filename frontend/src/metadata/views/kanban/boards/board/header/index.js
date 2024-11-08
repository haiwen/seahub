import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../../../../../components/cell-formatter';
import { gettext } from '../../../../../../utils/constants';
import OpMenu from './op-menu';

import './index.css';
import { CellType } from '../../../../../constants';

const Header = ({ readonly, haveFreezed, value, groupByColumn, onDelete, onFreezed, onUnFreezed }) => {
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
      </div>
      {value && !readonly && active && (
        <OpMenu onDelete={onDelete} onFreezed={onFreezed} onUnFreezed={handelUnFreezed} />
      )}
    </div>
  );
};

Header.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  groupByColumn: PropTypes.object,
  onDelete: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default Header;
