import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

const propTypes = {
  type: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([PropTypes.bool, PropTypes.array]),
};

class TrafficTable extends React.Component {

  getTrafficTypeName = () => {
    let { type } = this.props;
    let trafficTypeName;
    switch(type) {
      case 'user':
        trafficTypeName = 'User';
        break;
      case 'org': 
        trafficTypeName = 'Org';
        break;
    }
    return trafficTypeName;
  }

  render() {

    let trafficTypeName = this.getTrafficTypeName();
    
    return (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="16%">{gettext('{trafficTypeName}').replace('{trafficTypeName}', trafficTypeName)}</th>
            <th width="11%">{gettext('Sync Upload')}</th>
            <th width="14%">{gettext('Sync Download')}</th>
            <th width="11%">{gettext('Web Upload')}</th>
            <th width="14%">{gettext('Web Download')}</th>
            <th width="17%">{gettext('Link Upload')}</th>
            <th width="17%">{gettext('Link Download')}</th>
          </tr>
        </thead>
        <tbody>
          {this.props.children}
        </tbody>
      </table>
    );
  }
}

TrafficTable.propTypes = propTypes;

export default TrafficTable;