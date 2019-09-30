import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  row: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
};

class AppMain extends React.Component {

  render() {
    return (
      <div className="app-main">
        <div className="dtable-share-row-container">
          <div className="rows">{this.props.row}</div>
          <div className="columns">{this.props.columns}</div>
        </div>
      </div>
    );
  }
}

AppMain.propTypes = propTypes;

export default AppMain;
