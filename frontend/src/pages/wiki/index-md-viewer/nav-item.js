import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import { gettext } from '@/utils/constants';

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
    const { expanded } = this.state;
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
      if (children && children.length > 0) {
        return (
          <div className={className}>
            <button type="button" className="wiki-nav-toggle-label" onClick={this.itemClick} aria-expanded={expanded}>
              {name}
            </button>
          </div>
        );
      }
      return <div className={className}><span title={name}>{name}</span></div>;
    }

    return null;
  };

  render() {
    const { node } = this.props;
    const { expanded } = this.state;
    if (node.children.length > 0) {
      return (
        <div className="pl-4 position-relative">
          <button
            type="button"
            className="switch-btn"
            onClick={this.toggleExpanded}
            aria-label={expanded ? gettext('Collapse') : gettext('Expand')}
            aria-expanded={expanded}
          >
            <span className={`${expanded ? '' : 'rotate-270 d-inline-flex align-items-center'}`} aria-hidden="true">
              <Icon symbol="down" />
            </span>
          </button>
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
