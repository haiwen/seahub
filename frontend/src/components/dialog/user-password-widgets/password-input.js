import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, InputGroup, Input, Button } from 'reactstrap';
import classnames from 'classnames';
import PasswordStrengthChecker from './password-strength-checker';
import { isMobile } from '../../../utils/utils';

import '../../../css/password-input.css';

const propTypes = {
  value: PropTypes.string,
  labelValue: PropTypes.string,
  enableCheckStrength: PropTypes.bool,
  onChangeValue: PropTypes.func,
};

const PasswordInput = ({ value, labelValue, enableCheckStrength = true, onChangeValue }) => {
  const [passwordValue, setPasswordValue] = useState(value || '');
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isShowChecker, setIsShowChecker] = useState(false);

  const changePasswordValue = (e) => {
    const updatedValue = e.target.value;
    onChangeValue(updatedValue);
    setPasswordValue(updatedValue);
  };

  const handleFocus = () => {
    if (enableCheckStrength) {
      setIsShowChecker(true);
    }
  };

  const handleBlur = () => {
    if (enableCheckStrength) {
      setIsShowChecker(false);
    }
  };

  return (
    <FormGroup className={classnames('password-input-container position-relative', { 'mobile': isMobile })}>
      <Label>{labelValue}</Label>
      <InputGroup className='password'>
        <Input
          type={isShowPassword ? 'text' : 'password'}
          value={value}
          onChange={changePasswordValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isShowChecker && enableCheckStrength && (
          <PasswordStrengthChecker
            passwordValue={passwordValue}
          />
        )}
        <Button onClick={() => setIsShowPassword(!isShowPassword)}>
          <i className={`password-icon sf3-font sf3-font-eye${isShowPassword ? '' : '-slash'}`} />
        </Button>
      </InputGroup>
    </FormGroup>
  );
};

PasswordInput.propTypes = propTypes;

export default PasswordInput;
