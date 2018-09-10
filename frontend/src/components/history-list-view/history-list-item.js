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

  onMenuControlClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onMenuControlClick(e, this.props.item , this.props.isFirstItem);
  }

  render() {
    let item = this.props.item;
    let time = moment(item.ctime).format('MMMDo Ah:mm');
    return (
      <li className="history-list-item" onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <div className="history-info">
          <div className="time">{time}</div>
          <div className="owner">
            <span className="squire-icon"></span>
            <span>{item.creator_name}</span>
          </div>
        </div>
        <div className="history-operation">
          <NodeMenuControl
            isShow={this.state.isShowOperationIcon}
            onClick={this.onMenuControlClick}
          />
        </div>
      </li>
    );
  }
}

export default HistoryListItem;