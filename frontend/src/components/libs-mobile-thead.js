import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

const propTypes = {
  inAllLibs: PropTypes.bool
};

class LibsMobileThead extends React.Component {

  render() {
    const { inAllLibs = false } = this.props;
    const widthList = inAllLibs ? ['14%', '78%', '8%'] : ['12%', '80%', '8%'];
    return (
      <thead>
        <tr>
          <th width={widthList[0]}><span className="sr-only">{gettext('Library Type')}</span></th>
          <th width={widthList[1]}></th>
          <th width={widthList[2]}><span className="sr-only">{gettext('Actions')}</span></th>
        </tr>
      </thead>
    );
  }
}

LibsMobileThead.propTypes = propTypes;

export default LibsMobileThead;
