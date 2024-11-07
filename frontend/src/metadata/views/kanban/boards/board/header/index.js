import React from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../../../../../components/cell-formatter';
import { gettext } from '../../../../../../utils/constants';

import './index.css';

const Header = ({ value, groupByColumn, deleteOption }) => {

  return (
    <div className="sf-metadata-view-kanban-board-header">
      <div className="sf-metadata-view-kanban-board-header-title">
        {value ? (
          <CellFormatter value={value} field={groupByColumn} readonly={true} />
        ) : (
          <span>{gettext('Uncategorized')}</span>
        )}
      </div>
    </div>
  );
};

Header.propTypes = {
  value: PropTypes.any,
  groupByColumn: PropTypes.object,
  deleteOption: PropTypes.func,
};

export default Header;
