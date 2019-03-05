import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object
  ]).isRequired,
};

class DraftsView extends React.Component {
  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <div className="path-container">
              <h3 className="sf-heading">{gettext('Drafts')}</h3>
            </div>
          </div>
          {this.props.children}
        </div>
      </div>
    );
  }
}

DraftsView.propTypes = propTypes;

export default DraftsView;
