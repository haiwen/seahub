import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import Icon from '../../icon';

const propTypes = {
  type: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  children: PropTypes.oneOfType([PropTypes.bool, PropTypes.array]),
};

class TrafficTable extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { type, sortBy, sortOrder } = this.props;
    const renderSortHeader = (label, sortKey, width) => {
      const isSorted = sortBy === sortKey;
      const ariaSort = isSorted ? (sortOrder == 'asc' ? 'ascending' : 'descending') : undefined;
      const sortIcon = sortOrder == 'asc' ? <Icon symbol="down" className="rotate-180 d-inline-block" aria-hidden="true" /> : <Icon symbol="down" aria-hidden="true" />;

      return (
        <th width={width} scope="col" aria-sort={ariaSort}>
          <button type="button" className="d-block table-sort-op cursor-pointer" onClick={() => this.props.sortItems(sortKey)}>
            {label} {isSorted && sortIcon}
          </button>
        </th>
      );
    };

    return (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="16%" scope="col">{type == 'user' ? gettext('User') : gettext('Organization')}</th>
            {renderSortHeader(gettext('Sync Upload'), 'sync_file_upload', '11%')}
            {renderSortHeader(gettext('Sync Download'), 'sync_file_download', '14%')}
            {renderSortHeader(gettext('Web Upload'), 'web_file_upload', '11%')}
            {renderSortHeader(gettext('Web Download'), 'web_file_download', '14%')}
            {renderSortHeader(gettext('Share link upload'), 'link_file_upload', '17%')}
            {renderSortHeader(gettext('Share link download'), 'link_file_download', '17%')}
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
