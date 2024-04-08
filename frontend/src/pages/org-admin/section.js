import React, { Component } from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  headingText: PropTypes.string.isRequired,
  children: PropTypes.object.isRequired
};

class Section extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { headingText, children} = this.props;
    return (
      <div className="mb-4">
        <h4 className="border-bottom font-weight-normal mb-2 pb-1">{headingText}</h4>
        {children}
      </div>
    );
  }
}

Section.propTypes = propTypes;

export default Section;
