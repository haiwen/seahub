import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

const propTypes = {
  type: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([PropTypes.bool, PropTypes.array]),
};

class TrafficTable extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showIconName: 'link_file_download'
    };
  }

  componentDidMount() {
    let { showIconName } = this.state;
    let { sortOrder } = this.props;
    this.props.sortBySize(showIconName, sortOrder);
  }

  sortBySize = (sortByType) => {
    let { sortOrder } = this.props;
    let newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    this.setState({
      showIconName: sortByType
    });

    this.props.sortBySize(sortByType, newSortOrder);
  }

  render() {
    const { type, sortOrder } = this.props;
    const { showIconName } = this.state;
    const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

    return (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="16%">{type == 'user' ? gettext('User') : gettext('Organization')}</th>
            <th width="11%"><div className="d-block table-sort-op cursor-pointer" onClick={this.sortBySize.bind(this, 'sync_file_upload')}>{gettext('Sync Upload')} {showIconName === 'sync_file_upload' && sortIcon}</div></th>
            <th width="14%"><div className="d-block table-sort-op cursor-pointer" onClick={this.sortBySize.bind(this, 'sync_file_donwload')}>{gettext('Sync Download')} {showIconName === 'sync_file_donwload' && sortIcon}</div></th>
            <th width="11%"><div className="d-block table-sort-op cursor-pointer" onClick={this.sortBySize.bind(this, 'web_file_upload')}>{gettext('Web Upload')} {showIconName === 'web_file_upload' && sortIcon}</div></th>
            <th width="14%"><div className="d-block table-sort-op cursor-pointer" onClick={this.sortBySize.bind(this, 'web_file_download')}>{gettext('Web Download')} {showIconName === 'web_file_download' && sortIcon}</div></th>
            <th width="17%"><div className="d-block table-sort-op cursor-pointer" onClick={this.sortBySize.bind(this, 'link_file_upload')}>{gettext('Share link upload')} {showIconName === 'link_file_upload' && sortIcon}</div></th>
            <th width="17%"><div className="d-block table-sort-op cursor-pointer" onClick={this.sortBySize.bind(this, 'link_file_download')}>{gettext('Share link download')} {showIconName === 'link_file_download' && sortIcon}</div></th>
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
