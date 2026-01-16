import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import OpIcon from '../../op-icon';

const propTypes = {
  item: PropTypes.object.isRequired,
  onDeleteWebhook: PropTypes.func.isRequired,
  onEditWebhook: PropTypes.func.isRequired,
};

class WebhookItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ isOperationShow: true });
  };

  onMouseLeave = () => {
    this.setState({ isOperationShow: false });
  };

  onDeleteWebhook = () => {
    this.props.onDeleteWebhook(this.props.item);
  };

  onEditWebhook = () => {
    this.props.onEditWebhook(this.props.item);
  };

  render() {
    const { item } = this.props;

    return (
      <div
        className="webhook-list-item"
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <div className="text-truncate" title={item.url}>{item.url}</div>
        <div className={`webhook-item-operations ${this.state.isOperationShow ? '' : 'invisible'}`}>
          <OpIcon symbol="edit" className="op-icon mr-1" op={this.onEditWebhook} title={gettext('Edit')} />
          <OpIcon symbol="delete" className="op-icon" op={this.onDeleteWebhook} title={gettext('Delete')} />
        </div>
      </div>
    );
  }
}

WebhookItem.propTypes = propTypes;

export default WebhookItem;
