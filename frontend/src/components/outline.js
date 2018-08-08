import React from 'react';

class OutlineItem extends React.Component {

  render() {
    var item = this.props.item;
    var activeIndex = parseInt(this.props.activeIndex);
    var clazz = "wiki-outline-item " + item.clazz;
    clazz += item.key === activeIndex ? " wiki-outline-item-active" : "";
    return (
      <li className={clazz} data-index={item.key}>
        <a href={item.id} title={item.text} onClick={this.props.handleNavItemClick}>{item.text}</a>
      </li>
    )
  }

}

class Outline extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeIndex : 0
    }
    this.handleNavItemClick = this.handleNavItemClick.bind(this);
  }

  handleNavItemClick(event) {
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

        if (item.key > 20 && direction === "down") {
          outlineContainer.style.top = currentTop - 27 + "px";
        } else if (currentTop < 0 && direction === "up") {
          outlineContainer.style.top = currentTop + 27 + "px";
        }
        _this.setState({
          activeIndex : item.key
        })
      }
    })
  }
  
  render() {
    return (
      <ul className="wiki-viewer-outline" ref="outlineContainer">
        {this.props.navItems.map( item => {
          return (
            <OutlineItem 
              key={item.key} 
              item={item} 
              activeIndex = {this.state.activeIndex}
              handleNavItemClick={this.handleNavItemClick}
            />
          )
        })}
      </ul>
    )
  }
}

export default Outline;
