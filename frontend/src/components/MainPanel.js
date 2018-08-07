import React, { Component } from 'react';
import Search from './search';
import MarkdownViewer from './markdown-viewer';
import Account from './account';
import { repoID, serviceUrl, slug, siteRoot } from './constance';
import OutlineComponent from './outline';



class MainPanel extends Component {

  constructor(props) {
    super(props);
    this.scrollHandler.bind(this);
  }

  onMenuClick = () => {
    this.props.onMenuClick();
  }

  onEditClick = (e) => {
    // const w=window.open('about:blank')
    e.preventDefault();
    window.location.href= serviceUrl + '/lib/' + repoID + '/file' + this.props.filePath + '?mode=edit';
  }


  scrollHandler(event) {
    var headings = document.querySelectorAll('.cur-view-content [id^="user-content"]');
    var top = event.target.scrollTop;
    var currentId = '';
    headings.forEach(function(item){
      if(item.tagName === "H1"){  //delete h1 tag;
        return false;
      }
      if(top > item.offsetTop - 100){
        currentId = '#' + item.getAttribute('id');
      }else{
        return false;
      }
    })
    var outlineContainer = document.querySelector('.wiki-viewer-outline')
    var outlineItems = outlineContainer.childNodes;
    var lastActive = document.querySelector('.wiki-outline-item-active');
    if (lastActive) {
      if(lastActive.querySelector('a').getAttribute('href') !== currentId){
        lastActive.classList.remove('wiki-outline-item-active');
        outlineItems.forEach(function(item){
          var domA = item.querySelector('a');
          if(domA.getAttribute('href') === currentId){
            item.classList.add('wiki-outline-item-active');

            //controll the scroll popsition
            var scrollContainer = outlineContainer.parentNode;
            var lastIndex = scrollContainer.getAttribute('data-lastindex');
            var currentIndex = item.getAttribute('data-index');
            
            var direction = "down";
            if(lastIndex){
              direction = currentIndex > lastIndex ? "down" : "up";
            }
            scrollContainer.setAttribute('data-lastindex', currentIndex);

            if (direction === "down" && item.offsetTop > 540) {
              if (!scrollContainer.style.top) {
                scrollContainer.style.top = 0;
              }
              scrollContainer.style.top = (parseInt(scrollContainer.style.top) - 21) + "px";
            } else if (direction === "up" && parseInt(scrollContainer.style.top) < 0) {
              scrollContainer.style.top = (parseInt(scrollContainer.style.top) + 21) + "px";
            }
          }
        })
      }
    }else{
      outlineItems[0].classList.add('wiki-outline-item-active');
    }
  }

  render() {
    var filePathList = this.props.filePath.split('/');
    var pathElem = filePathList.map((item, index) => {
      if (item == "") {
        return;
      } else {
        return (
          <span key={index}><span className="path-split">/</span>{item}</span>
        )
      }
    });

    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-top panel-top">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.onMenuClick}></span>
           <div className={`wiki-page-ops ${this.props.permission === 'rw' ? '' : 'hide'}`}>
              <a className="btn btn-secondary btn-topbar" onClick={this.onEditClick}>Edit Page</a>
           </div>
          <div className="common-toolbar">
            <Search />
            <Account seafileAPI={this.props.seafileAPI} />
          </div>
        </div>
        <div className="cur-view-main">
          <div className="cur-view-path">
            <div className="path-containter">
              <a href={siteRoot + 'wikis/'} className="normal">Wikis</a>
              <span className="path-split">/</span>
              <a href={siteRoot + 'wikis/' + slug} className="normal">{slug}</a>
              {pathElem}
            </div>
          </div>
          <div className="cur-view-content-container" onScroll={this.scrollHandler}>
            <div className="cur-view-content">
                <MarkdownViewer
                  markdownContent={this.props.content}
                  onLinkClick={this.props.onLinkClick}
                />
                <p id="wiki-page-last-modified">Last modified by {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
            </div>
            <div className="cur-view-content-outline">
              <div className="outline-nav-body">
                <OutlineComponent markdownContent= {this.props.content}/>
              </div>
            </div>
          </div>
        </div>
    </div>
    )
  }
}

export default MainPanel;
