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
      isHighlighted: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ isHighlighted: true });
  };

  onMouseLeave = () => {
    this.setState({ isHighlighted: false });
  };

  onDeleteWebhook = () => {
    this.props.onDeleteWebhook(this.props.item);
  };

  onEditWebhook = () => {
    this.props.onEditWebhook(this.props.item);
  };

  render() {
    const { item } = this.props;
    const { isHighlighted } = this.state;

    return (
      <tr
        className={isHighlighted ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <td className="text-truncate" title={item.url}>{item.url}</td>
        <td>
          <div className={isHighlighted ? '' : 'invisible'}>
            <OpIcon symbol="edit" className="op-icon mr-1" op={this.onEditWebhook} title={gettext('Edit')} />
            <OpIcon symbol="delete" className="op-icon" op={this.onDeleteWebhook} title={gettext('Delete')} />
          </div>
        </td>
      </tr>
    );
  }
}

WebhookItem.propTypes = propTypes;

export default WebhookItem;
