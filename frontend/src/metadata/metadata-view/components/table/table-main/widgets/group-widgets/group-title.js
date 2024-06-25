import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  CellType
} from '../../../../../_basic';
import { DELETED_OPTION_TIPS } from '../../../../../constants';
import { gettext } from '../../../../../utils';
import CellFormatter from '../../../../cell-formatter';

class GroupTitle extends Component {

  constructor(props) {
    super(props);
    this.state = {
      creator: null,
    };
    this.EmptyDOM = `(${gettext('Empty')})`;
    this.deletedOptionTips = gettext(DELETED_OPTION_TIPS);
    this.collaborators = window.sfMetadataContext.getCollaboratorsFromCache();
  }

  getOptionColors = () => {
    const { dtableUtils } = window.app;
    return dtableUtils.getOptionColors();
  };

  renderCollaborator = (collaborator) => {
    const { email, avatar_url, name } = collaborator || {};
    return (
      <div className='collaborator' key={email}>
        <span className='collaborator-avatar-container'>
          <img src={avatar_url} alt={name} className='collaborator-avatar' />
        </span>
        <span className='collaborator-name' title={name} aria-label={name}>{name}</span>
      </div>
    );
  };

  renderGroupCellVal = (column, cellValue, originalCellValue = null) => {
    const { type } = column;
    switch (type) {
      case CellType.CREATOR:
      case CellType.LAST_MODIFIER: {
        if (!originalCellValue) return this.EmptyDOM;
        return (
          <CellFormatter value={originalCellValue} field={column} />
        );
      }
      default: {
        return cellValue || this.EmptyDOM;
      }
    }
  };

  render() {
    const { column, originalCellValue, cellValue } = this.props;
    return (
      <div className="group-title">
        <div className="group-column-name">{column.name}</div>
        <div className="group-cell-value">{this.renderGroupCellVal(column, cellValue, originalCellValue)}</div>
      </div>
    );
  }
}

GroupTitle.propTypes = {
  originalCellValue: PropTypes.any,
  cellValue: PropTypes.any,
  column: PropTypes.object,
};

export default GroupTitle;
