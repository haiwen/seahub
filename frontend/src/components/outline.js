import React from 'react';

class OutlineItem extends React.Component {

  render() {
    var item = this.props.item;
    var activeIndex = parseInt(this.props.activeIndex);
    var clazz = "wiki-outline-item " + item.clazz;
    clazz += item.key === activeIndex ? " wiki-outline-item-active" : "";
    return (
      <li className={clazz} data-index={item.key}>
        <a href={"#" + item.id} title={item.text} onClick={this.props.handleNavItemClick}>{item.text}</a>
      </li>
    )
  }

}

class Outline extends React.Component {
  
  render() {
    return (
      <ul className="wiki-viewer-outline">
        {this.props.navItems.map( item => {
          return (
            <OutlineItem 
              key={item.key} 
              item={item} 
              activeIndex = {this.props.activeIndex}
              handleNavItemClick={this.props.handleNavItemClick}
            />
          )
        })}
      </ul>
    )
  }
}

export default Outline;
