import React from 'react';

class WikiOutlineItem extends React.Component {

  render() {
    let item = this.props.item;
    let activeIndex = parseInt(this.props.activeIndex);
    let levelClass  = item.depth === 3 ? " textindent-2" : '';
    let activeClass = item.key === activeIndex ? ' wiki-outline-item-active' : '';
    let clazz = "wiki-outline-item"+ levelClass + activeClass;
    return (
      <li className={clazz} data-index={item.key}>
        <a href={item.id} title={item.text} onClick={this.props.handleNavItemClick}>{item.text}</a>
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

  handleNavItemClick = (event) => {
    var currentIndex = event.target.parentNode.getAttribute("data-index");
    if (currentIndex !== this.state.activeIndex) {
      this.setState({
        activeIndex : currentIndex
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    let _this = this;
    let activeId = nextProps.activeId;
    let navItems = nextProps.navItems;
    navItems.forEach(item => {
      if (item.id === activeId && item.key !== _this.state.activeIndex) {
        let direction = item.key > _this.state.activeIndex ? "down" : "up";
        let outlineContainer = this.refs.outlineContainer;
        let currentTop = outlineContainer.style.top ? parseInt(outlineContainer.style.top) : 0;
        let scrollTop = 0; 
        if (item.key > 20 && direction === "down") {
          scrollTop = currentTop - 27 + "px";
        } else if (currentTop < 0 && direction === "up") {
          scrollTop = currentTop + 27 + "px";
        }
        _this.setState({
          activeIndex : item.key,
          scrollTop: scrollTop
        })
      }
    })
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
              handleNavItemClick={this.handleNavItemClick}
            />
          )
        })}
      </ul>
    )
  }
}

export default WikiOutline;
