import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

function CommonUndoTool(props) {
  const style = {
    color: 'rgb(71, 184, 129)',
    marginLeft: '8px',
    paddingBottom: '1px',
    borderBottom: '1px solid rgb(71, 184, 129)',
    cursor: 'pointer',
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); props.onUndoOperation(e); }}
      onKeyDown={Utils.onKeyDown}
      style={style}
    >
      {gettext('Undo')}
    </span>
  );
}

CommonUndoTool.propTypes = {
  onUndoOperation: PropTypes.func.isRequired,
};

export default CommonUndoTool;
