import React from 'react';

class ShortCut extends React.Component {
  constructor (props) {
    super(props);
    // get platform of browser
    this.platfrom = navigator.platform.indexOf('Win')< 0 ? "Mac": "Win";
  }
  render () {
    let shortcutFirKey = this.props.shortcutFirKey;
    let shortcutSecnKey = this.props.shortcutSecnKey;
    // shortcutFirstKey is an array when the key are diffrent in win and mac
    if (typeof shortcutFirKey === 'object') {
      if (this.platfrom === "Win") {
        shortcutFirKey = shortcutFirKey[0]
      } else {
        shortcutFirKey = shortcutFirKey[1]
      }
    }
    return (
      <li className={'help-shortcut'}>
        <div className={"help-shortcut-left"}>{this.props.shortcutName}</div>
        {shortcutFirKey || shortcutSecnKey?
          <div className={"help-shortcut-right"}>
            {shortcutFirKey? <div className={'key shortcut-first'}>{shortcutFirKey}</div>: null}
            {shortcutSecnKey? <div className={'key shortcut-second'}>{shortcutSecnKey}</div>: null}
          </div>
          : null
        }
      </li>
    )
  }
}


class HelpShortcutList extends React.Component {
  render (){
    let title = this.props.data.shortcutType;
    let dataList = this.props.data.shortcutData;
    let liArr = [];
    for (let prop in dataList){
      let shortcutKeyArr = dataList[prop];
      liArr.push(<ShortCut key={'help '+ prop} shortcutName={prop} shortcutSecnKey={shortcutKeyArr? shortcutKeyArr[1]:null} shortcutFirKey={shortcutKeyArr? shortcutKeyArr[0]: null}/>);
    }
    return (
      <div className={'help-content-container'}>
        <h5 className={'help-shortcut-type'}>
          {title}
        </h5>
        <ul className={'help-shortcut-list'}>
          { liArr }
        </ul>
      </div>
    )
  }
}


class UserHelpDialog extends React.Component {
  render () {
    return (
      <div  className={'seafile-editor-help align-self-end'}>
        <div className={'help-header d-flex'}>
          <div className={'help-title'}>{this.props.userHelp.title}</div>
          <div className={'help-close'} onClick={this.props.hideHelpDialog}><i className={'fa fa-times-circle'}/></div>
        </div>
        <div className={'help-content'}>
          {this.props.userHelp.userHelpData.map((item, index) => {return <HelpShortcutList key={'help-list'+ index} data={item}/>})
          }
        </div>
      </div>
    )
  }
}

export default UserHelpDialog
