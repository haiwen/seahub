import React from 'react';
import moment from 'moment';
import NodeMenuControl from '../menu-component/node-menu-control';

moment.locale(window.app.config.lang);
class HistoryListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperationIcon: false
    }
  }

  onMouseEnter = () => {
    if (!this.props.isItemFrezeed) {
      this.setState({isShowOperationIcon: true});
    }
  }
  
  onMouseLeave = () => {
    if (!this.props.isItemFrezeed) {
      this.setState({isShowOperationIcon: false});
    }
  }

  onClick = () => {
    this.setState({isShowOperationIcon: false});
    this.props.onHistoryItemClick(this.props.item);
  }

  onMenuControlClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onMenuControlClick(e, this.props.item , this.props.isFirstItem);
  }

  render() {
    let item = this.props.item;
    let time = moment(item.ctime).format('MMMDo Ah:mm');
    let isHigtlightItem = false;
    if (this.props.item && this.props.currentItem) {
      isHigtlightItem = this.props.item.commit_id === this.props.currentItem.commit_id;
    }
    return (
      <li 
        className={`history-list-item ${isHigtlightItem ? 'high-light' : ''}`} 
        onMouseEnter={this.onMouseEnter} 
        onMouseLeave={this.onMouseLeave}
        onClick={this.onClick}
      >
        <div className="history-info">
          <div className="time">{time}</div>
          <div className="owner">
            <span className="squire-icon"></span>
            <span>{item.creator_name}</span>
          </div>
        </div>
        <div className="history-operation">
          <NodeMenuControl
            isShow={this.state.isShowOperationIcon || isHigtlightItem}
            onClick={this.onMenuControlClick}
          />
        </div>
      </li>
    );
  }
}

export default HistoryListItem;