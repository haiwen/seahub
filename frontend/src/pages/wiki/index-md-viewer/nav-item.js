import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Icon from '../../../components/icon';

const propTypes = {
  node: PropTypes.object.isRequired,
  currentPath: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
};

class NavItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      expanded: false
    };
  }

  toggleExpanded = () => {
    const { expanded } = this.state;
    this.setState({ expanded: !expanded });
  };

  onLinkClick = (event) => {
    event.preventDefault();
    const { node } = this.props;
    const { expanded } = this.state;
    if (node.children && node.children.length > 0 && !expanded) {
      this.setState({ expanded: !expanded });
      return;
    }
    this.props.onLinkClick(node);
  };

  itemClick = () => {
    const { node } = this.props;
    const { expanded } = this.state;
    if (node.children && node.children.length > 0) {
      this.setState({ expanded: !expanded });
      return;
    }
  };

  renderLink = ({ href, name, path, children }) => {
    const { currentPath } = this.props;
    const className = classNames('wiki-nav-content', {
      'no-children': !children || children.length === 0,
      'wiki-nav-content-highlight': currentPath === path,
    });
    if (href && name) {
      return (
        <div className={className}>
          <a href={href} data-path={path} onClick={this.onLinkClick} title={name}>{name}</a>
        </div>
      );
    }

    if (name) {
      return <div className={className} onClick={this.itemClick}><span title={name}>{name}</span></div>;
    }

    return null;
  };

  render() {
    const { node } = this.props;
    const { expanded } = this.state;
    if (node.children.length > 0) {
      return (
        <div className="pl-4 position-relative">
          <span className="switch-btn" onClick={this.toggleExpanded}>
            <span className={`${expanded ? '' : 'rotate-270 d-inline-flex align-items-center'}`} aria-hidden="true">
              <Icon symbol="arrow-down" />
            </span>
          </span>
          {this.renderLink(node)}
          {expanded && node.children.map((child, index) => {
            return (
              <NavItem key={index} node={child} currentPath={this.props.currentPath} onLinkClick={this.props.onLinkClick} />
            );
          })}
        </div>
      );
    }

    return this.renderLink(node);
  }
}

NavItem.propTypes = propTypes;

export default NavItem;
