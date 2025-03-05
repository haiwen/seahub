import React from 'react';
import PropTypes from 'prop-types';

class CellMask extends React.PureComponent {

  componentDidUpdate() {
    // Scrolling left and right causes the interface to re-render,
    // and the style of CellMask is reset and needs to be fixed
    if (this.cellMaskNode && this.cellMaskNode.style.position === 'fixed') {
      this.cellMaskNode.style.transform = 'none';
    }
  }

  getMaskStyle = () => {
    const { width, height, top, left, zIndex } = this.props;
    // mask border needs to cover cell border, height and width are increased 1, left and top are decreased 1
    return {
      height: height - 1,
      width: width,
      zIndex,
      position: 'absolute',
      pointerEvents: 'none',
      transform: `translate(${left}px, ${top}px)`,
      outline: 0
    };
  };

  setNode = (node) => {
    this.cellMaskNode = node;
    this.props.innerRef && this.props.innerRef(node);
  };

  render() {
    const { width, height, top, left, zIndex, children, innerRef, ...rest } = this.props;
    const style = this.getMaskStyle();
    return (
      <div
        style={style}
        data-test="cell-mask"
        ref={this.setNode}
        {...rest}
      >
        {children}
      </div>
    );
  }
}

CellMask.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  top: PropTypes.number.isRequired,
  left: PropTypes.number.isRequired,
  zIndex: PropTypes.number.isRequired,
  children: PropTypes.node,
  innerRef: PropTypes.func
};

export default CellMask;
