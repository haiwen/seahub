import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

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
    const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

    return (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="16%">{type == 'user' ? gettext('User') : gettext('Organization')}</th>
            <th width="11%"><div className="d-block table-sort-op cursor-pointer" onClick={this.props.sortItems.bind(this, 'sync_file_upload')}>{gettext('Sync Upload')} {sortBy === 'sync_file_upload' && sortIcon}</div></th>
            <th width="14%"><div className="d-block table-sort-op cursor-pointer" onClick={this.props.sortItems.bind(this, 'sync_file_download')}>{gettext('Sync Download')} {sortBy === 'sync_file_download' && sortIcon}</div></th>
            <th width="11%"><div className="d-block table-sort-op cursor-pointer" onClick={this.props.sortItems.bind(this, 'web_file_upload')}>{gettext('Web Upload')} {sortBy === 'web_file_upload' && sortIcon}</div></th>
            <th width="14%"><div className="d-block table-sort-op cursor-pointer" onClick={this.props.sortItems.bind(this, 'web_file_download')}>{gettext('Web Download')} {sortBy === 'web_file_download' && sortIcon}</div></th>
            <th width="17%"><div className="d-block table-sort-op cursor-pointer" onClick={this.props.sortItems.bind(this, 'link_file_upload')}>{gettext('Share link upload')} {sortBy === 'link_file_upload' && sortIcon}</div></th>
            <th width="17%"><div className="d-block table-sort-op cursor-pointer" onClick={this.props.sortItems.bind(this, 'link_file_download')}>{gettext('Share link download')} {sortBy === 'link_file_download' && sortIcon}</div></th>
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
