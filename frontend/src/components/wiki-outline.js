import React from 'react';
import PropTypes from 'prop-types';

const itemPropTypes = {
  activeIndex: PropTypes.number.isRequired,
  item: PropTypes.object.isRequired,
  handleNavItemClick: PropTypes.func.isRequired,
};

class WikiOutlineItem extends React.Component {

  handleNavItemClick = () => {
    var activeId = this.props.item.id;
    this.props.handleNavItemClick(activeId);
  }

  render() {
    let item = this.props.item;
    let activeIndex = parseInt(this.props.activeIndex);
    let levelClass  = item.depth === 3 ? ' textindent-2' : '';
    let activeClass = item.key === activeIndex ? ' wiki-outline-item-active' : '';
    let clazz = 'wiki-outline-item'+ levelClass + activeClass;
    return (
      <li className={clazz} data-index={item.key} onClick={this.handleNavItemClick}>
        <a href={item.id} title={item.text}>{item.text}</a>
      </li>
    );
  }

}

WikiOutlineItem.propTypes = itemPropTypes;

const outlinePropTypes = {
  navItems: PropTypes.array.isRequired,
  activeId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  handleNavItemClick: PropTypes.func.isRequired,
};

class WikiOutline extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeIndex : 0,
      scrollTop: 0,
    };
  }

  componentWillReceiveProps(nextProps) {
    let _this = this;
    let activeId = nextProps.activeId;
    let navItems = nextProps.navItems;
    let length = navItems.length;
    for (let i = 0; i < length; i++) {
      let flag = false;
      let item = navItems[i];
      if (item.id === activeId && item.key !== _this.state.activeIndex) {
        let scrollTop = 0;
        if (item.key > 20) {
          scrollTop = - (item.key - 20)*27 + 'px';
          if (parseInt(scrollTop) > 0) { // handle scroll quickly;
            scrollTop = 0;
          }
        }
        _this.setState({
          activeIndex : item.key,
          scrollTop: scrollTop
        });
        flag = true;
      }
      if (flag) {
        break;
      }
    }
  }

  render() {
    let style = {top: this.state.scrollTop};
    return (
      <ul className="wiki-viewer-outline" ref="outlineContainer" style={style}>
        {this.props.navItems.map(item => {
          return (
            <WikiOutlineItem
              key={item.key}
              item={item}
              activeIndex={this.state.activeIndex}
              handleNavItemClick={this.props.handleNavItemClick}
            />
          );
        })}
      </ul>
    );
  }
}

WikiOutline.propTypes = outlinePropTypes;

export default WikiOutline;
