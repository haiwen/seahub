import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  headingText: PropTypes.string.isRequired,
  children: PropTypes.object.isRequired
};

const Section = (props) => {
  const { headingText, children } = props;
  return (
    <div className="mb-4">
      <h4 className="border-bottom font-weight-normal mb-2 pb-1">{headingText}</h4>
      {children}
    </div>
  );
};

Section.propTypes = propTypes;

export default Section;
