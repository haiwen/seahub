import React from 'react';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import Notice from './notice';

class NoticeContainer extends React.Component {

  constructor(props) {
    super(props);
    this.transitionTime = 300;
    this.state = {notices: []}
  }

  addNotice = (notice) => {
    const { notices } = this.state;
    notice.key = this.getNoticeKey();
    if (notices.every(item => item.key !== notice.key)) {
      notices.push(notice);
      this.setState({notices});
      if (notice.duration > 0 ) {
        setTimeout( () => {
          this.removeNotice(notice.key);
        }, notice.duration);
      }
    }

    return () => this.removeNotice(notice.key);
  }

  removeNotice = (key) => {
    const { notices } = this.state;
    this.setState({
      notices: notices.filter((notice) => {
        if (notice.key === key) {
          if (notice.close) {
            setTimeout(notice.close, this.transitionTime);
            return true;
          }
          return false;
        }
      })
    });
  }

  getNoticeKey = () => {
    const { notices } = this.state;
    return `notice-${new Date().getTime()}-${notices.length}`
  }

  render() {
    const { notices } = this.state;
    return (
      <TransitionGroup className="toast-notification">
        {notices.map((notice) => {
          return (
            <CSSTransition
              key={notice.key}
              classNames="toast-notice-wrapper notice"
              timeout={this.transitionTime}
            >
              <Notice key={notice.key} {...notice} />
            </CSSTransition>
          );
        })}
      </TransitionGroup>
    );
  }

}

export default NoticeContainer;
