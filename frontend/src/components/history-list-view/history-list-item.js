import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem} from 'reactstrap';
import { gettext, filePath } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';

import '../../css/history-record-item.css';

moment.locale(window.app.config.lang);

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
      isMenuShow: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({isShowOperationIcon: true});
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({isShowOperationIcon: false});
    }
  }

  onToggleClick = (e) => {
    this.setState({isMenuShow: !this.state.isMenuShow});
    this.props.onFreezedItemToggle();
  }

  onItemClick = () => {
    this.setState({isShowOperationIcon: false});  //restore to default state
    if (this.props.item.commit_id === this.props.currentItem.commit_id) {
      return;
    }
    let currentIndex = this.props.index;
    this.props.onItemClick(this.props.item, currentIndex);
  }

  onItemRestore = () => {
    this.props.onItemRestore(this.props.currentItem);
  }

  onItemDownload = () => {
    // nothing todo
  }

  render() {
    if (!this.props.currentItem) {
      return '';
    }
    let item = this.props.item;
    let time = moment(item.ctime).format('YYYY-MM-DD HH:mm');
    let isHigtlightItem = false;
    if (this.props.item && this.props.currentItem) {
      isHigtlightItem = this.props.item.commit_id === this.props.currentItem.commit_id;
    }
    let objID = this.props.currentItem.rev_file_id;
    let url = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: objID});
    return (
      <li
        className={`history-list-item ${isHigtlightItem ? 'item-active' : ''}`}
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
          <Dropdown isOpen={this.state.isMenuShow} toggle={this.onToggleClick}>
            <DropdownToggle
              tag='a'
              className={`fas fa-ellipsis-v ${(this.state.isShowOperationIcon || isHigtlightItem) ? '' : 'invisible'}`}
              data-toggle="dropdown"
              aria-expanded={this.state.isMenuShow}
              alt={gettext('More Operations')}
            />
            <DropdownMenu>
              {(this.props.index !== 0) && <DropdownItem onClick={this.onItemRestore}>{gettext('Restore')}</DropdownItem>}
              <DropdownItem tag='a' href={url} onClick={this.onItemDownLoad}>{gettext('Download')}</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </li>
    );
  }
}

HistoryListItem.propTypes = propTypes;

export default HistoryListItem;
