import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Progress } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { evaluatePasswordStrength } from '../../../utils/utils';

const propTypes = {
  passwordValue: PropTypes.string.isRequired,
};

const PASSWORD_STRENGTH_VALUES = {
  empty: { classNames: ['default', 'default', 'default', 'default'], textValue: '' },
  weak: { classNames: ['weak', 'default', 'default', 'default'], textValue: 'weak' },
  medium: { classNames: ['medium', 'medium', 'default', 'default'], textValue: 'medium' },
  strong: { classNames: ['strong', 'strong', 'strong', 'default'], textValue: 'strong' },
  very_strong: { classNames: ['very-strong', 'very-strong', 'very-strong', 'very-strong'], textValue: 'very strong' },
};

const PasswordStrengthChecker = ({ passwordValue }) => {
  const { classNames: progressClassNames = [], textValue = '' } = useMemo(() => PASSWORD_STRENGTH_VALUES[evaluatePasswordStrength(passwordValue)] || {}, [passwordValue]);
  const labelClassName = Array.isArray(progressClassNames) && progressClassNames.length > 0 ? progressClassNames[0] : '';

  return (
    <div className="password-strength-check-container">
      <div className='password-strength-check-box'>
        <div className="password-strength-value">
          <span>{gettext('Password strength')}: </span>
          <span className={labelClassName}>{gettext(textValue)}</span>
        </div>
        <Progress multi>
          {progressClassNames.map((className, index) => (
            <Progress
              bar
              key={index}
              className={className}
              value='25'
            />
          ))}
        </Progress>
        <div className='password-strength-description'>
          <span>{gettext('Password must be at least 8 characters long and contain different characters: uppercase letters, lowercase letters, numbers, and special symbols')}</span>
        </div>
      </div>
    </div>
  );
};

PasswordStrengthChecker.propTypes = propTypes;

export default PasswordStrengthChecker;
