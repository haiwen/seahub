import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Input, PopoverBody } from 'reactstrap';
import { CustomizePopover } from '@seafile/sf-metadata-ui-component';
import { KeyCodes } from '../../../../../constants';
import { ValidateColumnFormFields } from '../column-popover/utils';
import { COMMON_FORM_FIELD_TYPE } from '../column-popover/constants';
import { useMetadata } from '../../../hooks';
import { gettext } from '../../../utils';
import toaster from '../../../../../components/toast';

import './index.css';

const RenamePopover = ({ value: oldValue, target, onToggle, onSubmit }) => {
  const [value, setValue] = useState(oldValue);
  const inputRef = useRef(null);
  const { metadata } = useMetadata();

  const onChange = useCallback((event) => {
    const newValue = event.target.value;
    if (newValue === value) return;
    setValue(newValue);
  }, [value]);

  const handleSubmit = useCallback(() => {
    const valueError = ValidateColumnFormFields[COMMON_FORM_FIELD_TYPE.COLUMN_NAME]({ columnName: value, metadata, gettext });
    if (valueError) {
      toaster.danger(valueError.tips);
      return;
    }
    onSubmit(value);
  }, [value, onSubmit]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Enter) {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const onClick = useCallback((event) => {
    event.preventDefault();
  }, []);

  useEffect(() => {
    inputRef.current.focus();
    document.addEventListener('keydown', onHotKey);
    return () => {
      document.removeEventListener('keydown', onHotKey);
    };
  }, [onHotKey]);

  return (
    <CustomizePopover target={target} className="sf-metadata-rename-column-popover" hide={handleSubmit} hideWithEsc={onToggle}>
      <PopoverBody>
        <Form>
          <FormGroup>
            <Input value={value} innerRef={inputRef} onClick={onClick} onChange={onChange} />
          </FormGroup>
        </Form>
      </PopoverBody>
    </CustomizePopover>
  );
};

RenamePopover.propTypes = {
  target: PropTypes.string,
  value: PropTypes.string,
  onToggle: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default RenamePopover;
