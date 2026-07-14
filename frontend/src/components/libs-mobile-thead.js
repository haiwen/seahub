import React from 'react';
import { gettext } from '../utils/constants';

class LibsMobileThead extends React.Component {

  render() {
    return (
      <thead>
        <tr>
          <th><span className="sr-only">{gettext('Library Type')}</span></th>
          <th></th>
          <th><span className="sr-only">{gettext('Actions')}</span></th>
        </tr>
      </thead>
    );
  }
}

export default LibsMobileThead;
