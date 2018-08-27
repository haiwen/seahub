import React from 'react';

class WikiOutlineItem extends React.Component {

  handleNavItemClick = () => {
    var activeId = this.props.item.id;
    this.props.handleNavItemClick(activeId)
  }
  
  render() {
    let item = this.props.item;
    let activeIndex = parseInt(this.props.activeIndex);
    let levelClass  = item.depth === 3 ? " textindent-2" : '';
    let activeClass = item.key === activeIndex ? ' wiki-outline-item-active' : '';
    let clazz = "wiki-outline-item"+ levelClass + activeClass;
    return (
      <li className={clazz} data-index={item.key} onClick={this.handleNavItemClick}>
        <a href={item.id} title={item.text}>{item.text}</a>
      </li>
    )
  }

}

class WikiOutline extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeIndex : 0,
      scrollTop: 0,
    }
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
        let direction = item.key > _this.state.activeIndex ? "down" : "up";
        let currentTop = parseInt(_this.state.scrollTop);
        let scrollTop = 0; 
        if ((item.key > 20 && direction === "down") || 
          (currentTop < 0 && direction === "up")) {
          scrollTop = - (item.key - 20)*27 + "px";
        } 
        _this.setState({
          activeIndex : item.key,
          scrollTop: scrollTop
        })
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
          )
        })}
      </ul>
    )
  }
}

export default WikiOutline;
