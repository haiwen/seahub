import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../../components/icon';

import './index.css';

const CheckboxEditor = ({ value, onChange: onChangeAPI }) => {

  const onChange = useCallback((event) => {
    event && event.stopPropagation();
    onChangeAPI(!value);
  }, [value, onChangeAPI]);

  return (
    <div className="sf-metadata-property-detail-editor sf-metadata-checkbox-property-detail-editor">
      <div className="sf-metadata-checkbox-property-detail-editor-content" onClick={onChange}>
        {value && (<Icon symbol="check-mark" />)}
      </div>
    </div>
  );
};

CheckboxEditor.propTypes = {
  value: PropTypes.bool,
  onChange: PropTypes.func,
};

export default CheckboxEditor;
