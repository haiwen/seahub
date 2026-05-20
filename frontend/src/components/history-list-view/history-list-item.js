import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { gettext, filePath } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';
import CustomDropdown from '../dropdown';

import '../../css/history-record-item.css';

dayjs.locale(window.app.config.lang);

const propTypes = {
  index: PropTypes.number.isRequired,
  item: PropTypes.object.isRequired,
  currentItem: PropTypes.object,
  isItemFreezed: PropTypes.bool.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemRestore: PropTypes.func.isRequired,
  onFreezedItemToggle: PropTypes.func.isRequired,
};

class HistoryListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperationIcon: false,
      isDropdownFrozen: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ isShowOperationIcon: true });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ isShowOperationIcon: false });
    }
  };

  handleDropdownOpen = () => {
    this.setState({ isDropdownFrozen: true });
    this.props.onFreezedItemToggle();
  };

  handleDropdownClose = () => {
    this.setState({ isDropdownFrozen: false, isShowOperationIcon: false });
    this.props.onFreezedItemToggle();
  };

  onItemClick = () => {
    this.setState({ isShowOperationIcon: false });
    if (this.props.item.commit_id === this.props.currentItem.commit_id) {
      return;
    }
    let currentIndex = this.props.index;
    this.props.onItemClick(this.props.item, currentIndex);
  };

  onItemRestore = () => {
    this.props.onItemRestore(this.props.currentItem);
  };

  getMenuItems = () => {
    if (!this.props.currentItem) return [];
    let objID = this.props.currentItem.rev_file_id;
    let url = URLDecorator.getUrl({ type: 'download_historic_file', filePath: filePath, objID: objID });
    const items = [];
    if (this.props.index !== 0) {
      items.push({ key: 'restore', label: gettext('Restore'), onClick: this.onItemRestore });
    }
    items.push({ key: 'download', label: gettext('Download'), onClick: () => { window.location = url; } });
    return items;
  };

  render() {
    if (!this.props.currentItem) {
      return '';
    }
    let item = this.props.item;
    let time = dayjs(item.ctime).format('YYYY-MM-DD HH:mm');
    let isHighlightItem = false;
    if (this.props.item && this.props.currentItem) {
      isHighlightItem = this.props.item.commit_id === this.props.currentItem.commit_id;
    }
    return (
      <li
        className={`history-list-item ${isHighlightItem ? 'item-active' : ''}`}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onClick={this.onItemClick}
      >
        <div className="history-info">
          <div className="time">{time}</div>
          <div className="owner">
            <span className="squire-icon"></span>
            <span>{item.creator_name}</span>
          </div>
        </div>
        <div className="history-operation">
          <CustomDropdown
            items={this.getMenuItems()}
            triggerClassName={(this.state.isShowOperationIcon || isHighlightItem) ? '' : 'invisible'}
            freezeItem={this.handleDropdownOpen}
            unfreezeItem={this.handleDropdownClose}
          />
        </div>
      </li>
    );
  }
}

HistoryListItem.propTypes = propTypes;

export default HistoryListItem;
