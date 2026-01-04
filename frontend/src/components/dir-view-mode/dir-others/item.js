import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import Icon from '../../icon';

const propTypes = {
  text: PropTypes.string.isRequired,
  iconSymbol: PropTypes.string.isRequired,
  op: PropTypes.func.isRequired,
  isActive: PropTypes.bool
};

class Item extends React.Component {
  render() {
    const { text, op, iconSymbol, isActive = false } = this.props;
    return (
      <div
        role="button"
        tabIndex="0"
        className={`dir-others-item text-nowrap ${isActive ? 'tree-node-hight-light' : ''}`}
        title={text}
        onClick={op}
        onKeyDown={Utils.onKeyDown}
      >
        <span className="d-flex align-items-center"><Icon symbol={iconSymbol} /></span>
        <span className="dir-others-item-text">{text}</span>
      </div>
    );
  }
}

Item.propTypes = propTypes;

export default Item;
