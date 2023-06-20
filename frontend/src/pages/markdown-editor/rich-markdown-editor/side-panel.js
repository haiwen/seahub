/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import { Outline as OutlineView } from '@seafile/seafile-editor';
import DetailListView from './detail-list-view';
import CommentPanel from './comment-panel';

import '../css/side-panel.css';

const propTypes = {
  document: PropTypes.array,
  fileInfo: PropTypes.object.isRequired,
  relistComment: PropTypes.number,
  fileTagList: PropTypes.array,
  onFileTagChanged: PropTypes.func.isRequired,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func.isRequired,
  toggleCommentBtn: PropTypes.func.isRequired,
};

class SidePanel extends React.PureComponent {
  
  state = {
    navItem: 'outline'
  }

  onOutlineClick = (event) => {
    event.preventDefault();
    this.props.toggleCommentBtn(false);
    this.setState({navItem: 'outline'});
  }

  onDetailClick = (event) => {
    event.preventDefault();
    this.props.toggleCommentBtn(false);
    this.setState({navItem: 'detail'});
  }

  onCommentsPanelClick = (event) => {
    event.preventDefault();
    this.props.toggleCommentBtn(true);
    this.setState({navItem: 'commentsPanel'});
  }

  render() {
    var outlineActive = '';
    var commentsPanel = '';
    var detailList = '';
    if (this.state.navItem === 'outline') {
      outlineActive = 'active';
    } else if (this.state.navItem === 'commentsPanel') {
      commentsPanel = 'active';
    } else if (this.state.navItem === 'detail') {
      detailList = 'active';
    }

    return (
      <div className="side-panel d-flex flex-column">
        <ul className="flex-shrink-0 nav justify-content-around bg-white">
          <li className="nav-item">
            <a className={'nav-link ' + outlineActive} href="" onClick={this.onOutlineClick}><i className="iconfont icon-list-ul"/></a>
          </li>
          <li className="nav-item">
            <a className={'nav-link ' + detailList} href="" onClick={this.onDetailClick}><i className={'iconfont icon-info-circle'}/></a>
          </li>
          <li className="nav-item">
            <a className={'nav-link ' + commentsPanel} href="" onClick={this.onCommentsPanelClick}>
              <i className={'iconfont icon-comment'}/>
            </a>
          </li>
        </ul>
        <div className="side-panel-content flex-fill">
          {this.state.navItem === 'outline' &&
            <OutlineView document={this.props.document} />
          }
          {this.state.navItem === 'commentsPanel' &&
            <CommentPanel
              relistComment={this.props.relistComment}
              participants={this.props.participants}
              onParticipantsChange={this.props.onParticipantsChange}
            />
          }
          {this.state.navItem === 'detail' &&
            <DetailListView
              fileInfo={this.props.fileInfo}
              fileTagList={this.props.fileTagList}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          }
        </div>
      </div>
    );
  }

}

SidePanel.propTypes = propTypes;

export default SidePanel;
