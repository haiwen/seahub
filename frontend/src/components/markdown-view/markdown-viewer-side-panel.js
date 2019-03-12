import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import HistoryList from './history-list';
import CommentsList from './comments-list';
import OutlineView from './outline';

const URL = require('url-parse');

const propTypes = {
  editorUtilities: PropTypes.object.isRequired,
  markdownContent: PropTypes.string.isRequired,
  commentsNumber: PropTypes.number.isRequired,
  viewer: PropTypes.object.isRequired,
  value: PropTypes.object.isRequired,
  activeTab: PropTypes.string.isRequired,
  showDiffViewer: PropTypes.func.isRequired,
  setDiffViewerContent: PropTypes.func.isRequired,
  reloadDiffContent: PropTypes.func.isRequired,
  tabItemClick: PropTypes.func.isRequired,
  getCommentsNumber: PropTypes.func.isRequired,
};

class MarkdownViewerSidePanel extends React.Component {

  constructor(props) {
    super(props);
  }

  tabItemClick = (tab) => {
    this.props.tabItemClick(tab);
  }

  showNavItem = (showTab) => {
    switch(showTab) {
      case 'outline':
        return (
          <NavLink className={classnames({ active: this.props.activeTab === 'outline' })}
            onClick={() => { this.tabItemClick('outline');}} ><i className="fa fa-list"></i>
          </NavLink>
        );
      case 'comments':
        return (
          <NavLink className={classnames({ active: this.props.activeTab === 'comments' })}
            onClick={() => {this.tabItemClick('comments');}}><i className="fa fa-comments"></i>
            {this.props.commentsNumber > 0 && <div className='comments-number'>{this.props.commentsNumber}</div>}
          </NavLink>
        );
      case 'history':
        return (
          <NavLink className={classnames({ active: this.props.activeTab === 'history' })}
            onClick={() => { this.tabItemClick('history');}}><i className="fas fa-history"></i>
          </NavLink>
        );
    }
  } 

  renderNavItems = () => {
    return (
      <Nav tabs className="md-side-panel-nav">
        <NavItem className="nav-item">{this.showNavItem('outline')}</NavItem>
        <NavItem className="nav-item">{this.showNavItem('comments')}</NavItem>
        <NavItem className="nav-item">{this.showNavItem('history')}</NavItem>
      </Nav>
    );
  }

  scrollToNode = (node) => {
    let url = new URL(window.location.href);
    url.set('hash', 'user-content-' + node.text);
    window.location.href = url.toString();
  }

  findScrollContainer = (el, window) => {
    let parent = el.parentNode;
    const OVERFLOWS = ['auto', 'overlay', 'scroll'];
    let scroller;
    while (!scroller) {
      if (!parent.parentNode) break;
      const style = window.getComputedStyle(parent);
      const { overflowY } = style;
      if (OVERFLOWS.includes(overflowY)) {
        scroller = parent;
        break;
      }
      parent = parent.parentNode;
    }
    if (!scroller) {
      return window.document.body;
    }
    return scroller;
  }

  scrollToQuote = (path) => {
    if (!path) return;
    const win = window;
    if (path.length > 2) {
      // deal with code block or chart
      path[0] = path[0] > 1 ? path[0] - 1 : path[0] + 1;
      path = path.slice(0, 1);
    }
    let node = this.props.value.document.getNode(path);
    if (!node) {
      path = path.slice(0, 1);
      node = this.props.value.document.getNode(path);
    }
    if (node) {
      let element = win.document.querySelector(`[data-key="${node.key}"]`);
      while (element.tagName === 'CODE') {
        element = element.parentNode;
      }
      const scroller = this.findScrollContainer(element, win);
      const isWindow = scroller == win.document.body || scroller == win.document.documentElement;
      if (isWindow) {
        win.scrollTo(0, element.offsetTop);
      } else {
        scroller.scrollTop = element.offsetTop;
      }
    }
  }

  componentDidMount() {
    this.tabItemClick('outline');
  }

  render() {
    return (
      <div className="seafile-md-viewer-side-panel">
        {this.renderNavItems()}
        <TabContent activeTab={this.props.activeTab}>
          <TabPane tabId="outline" className="outline">
            <OutlineView
              isViewer={true}
              document={this.props.value.document}
              editor={this.props.viewer}
              scrollToNode={this.scrollToNode}
            />
          </TabPane>
          <TabPane tabId="comments" className="comments">
            <CommentsList
              editorUtilities={this.props.editorUtilities}
              scrollToQuote={this.scrollToQuote}
              getCommentsNumber={this.props.getCommentsNumber}
              commentsNumber={this.props.commentsNumber}
            />
          </TabPane>
          <TabPane tabId="history" className="history">
            <HistoryList
              editorUtilities={this.props.editorUtilities}
              showDiffViewer={this.props.showDiffViewer}
              setDiffViewerContent={this.props.setDiffViewerContent}
              reloadDiffContent={this.props.reloadDiffContent}
            />
          </TabPane>
        </TabContent>
      </div>
    );
  }
}

MarkdownViewerSidePanel.propTypes = propTypes;

export default MarkdownViewerSidePanel;
