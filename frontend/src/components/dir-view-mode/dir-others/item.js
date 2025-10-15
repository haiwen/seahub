import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';

const propTypes = {
  text: PropTypes.string.isRequired,
  iconClass: PropTypes.string.isRequired,
  op: PropTypes.func.isRequired
};

class Item extends React.Component {
  render() {
    const { text, op, iconClass } = this.props;
    return (
      <div
        role="button"
        tabIndex="0"
        className='dir-others-item text-nowrap'
        title={text}
        onClick={op}
        onKeyDown={Utils.onKeyDown}
      >
        <span className={iconClass}></span>
        <span className="dir-others-item-text">{text}</span>
      </div>
    );
  }
}

Item.propTypes = propTypes;

export default Item;
