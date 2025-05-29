import React, { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormFeedback, Input } from 'reactstrap';
import classnames from 'classnames';
import { gettext } from '../../../../utils/constants';

// eslint-disable-next-line react/display-name
const ColumnName = forwardRef(({ readOnly, value }, ref) => {
  const [error, setError] = useState('');
  const [name, setName] = useState(value || '');

  const onNameChange = useCallback((event) => {
    const value = event.target.value;
    if (name === value) return;
    setName(value);
  }, [name]);

  useImperativeHandle(ref, () => ({
    getName: () => name,
    setError: (error) => setError(error),
  }), [name]);

  useEffect(() => {
    setName(value);
    setError('');
  }, [value]);

  return (
    <FormGroup className={classnames('sf-metadata-column-settings-item', { 'is-invalid': error })}>
      <Input
        placeholder={gettext('Property name')}
        value={name}
        onChange={onNameChange}
        readOnly={readOnly}
        autoFocus={true}
      />
      {error && (<FormFeedback>{error}</FormFeedback>)}
    </FormGroup>
  );
});

ColumnName.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.string,
};

export default ColumnName;
