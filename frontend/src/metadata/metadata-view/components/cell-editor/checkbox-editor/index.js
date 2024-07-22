import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Icon } from '@seafile/sf-metadata-ui-component';

import './index.css';

const CheckboxEditor = ({
  isCellSelected,
  field,
  value,
  onChange,
}) => {
  const [canChange, setCanChange] = useState(false);

  useEffect(() => {
    if (isCellSelected) return;
    setCanChange(false);
  }, [isCellSelected]);

  const onChangeValue = useCallback((event) => {
    event && event.stopPropagation();
    onChange({ [field.key]: !value });
  }, [value, field, onChange]);

  const onClickContainer = useCallback(() => {
    if (!canChange) {
      setCanChange(true);
      return;
    }
    onChangeValue();
  }, [value, field, canChange, onChangeValue]);

  return (
    <div className="sf-metadata-checkbox-editor" onClick={onClickContainer}>
      <div className="sf-metadata-checkbox-editor-content" onClick={onChangeValue}>
        {value && (<Icon iconName="check-mark" />)}
      </div>
    </div>
  );

};

CheckboxEditor.propTypes = {
  isCellSelected: PropTypes.bool,
  field: PropTypes.object,
  value: PropTypes.bool,
  onChange: PropTypes.func,
};

export default CheckboxEditor;
