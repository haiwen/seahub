import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import AsyncCollaborator from './async-collaborator';

const CollaboratorsFormatter = ({ value, className, children: emptyFormatter, ...params }) => {
  if (!Array.isArray(value) || value.length === 0) return emptyFormatter || null;
  const validValue = value.filter(item => item);
  if (validValue.length === 0) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container collaborators-formatter', className)}>
      {value.map(email => <AsyncCollaborator key={email} { ...params } value={email} />)}
    </div>
  );
};

CollaboratorsFormatter.propTypes = {
  value: PropTypes.array,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CollaboratorsFormatter;
