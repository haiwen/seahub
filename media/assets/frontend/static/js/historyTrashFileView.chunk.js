(this["webpackJsonpseahub-frontend"]=this["webpackJsonpseahub-frontend"]||[]).push([[11],{1720:function(e,t,a){a(76),e.exports=a(1757)},1721:function(e,t,a){},1757:function(e,t,a){"use strict";a.r(t);var n=a(3),c=a(5),i=a(7),r=a(6),o=a(2),s=a.n(o),l=a(31),j=a.n(l),u=a(291),b=a.n(u),p=a(1),d=a(0),f=window.app.pageOptions,O=f.fileName,v=f.repoID,h=f.objID,x=f.path;var m=function(){return Object(d.jsx)("a",{href:"".concat(p.vc,"repo/").concat(v,"/").concat(h,"/download/?file_name=").concat(encodeURIComponent(O),"&p=").concat(encodeURIComponent(x)),className:"btn btn-secondary",children:Object(p.tb)("Download")})},w=(a(876),window.app.pageOptions),y=w.fromTrash,k=w.fileName,g=w.commitTime,N=w.canDownloadFile,C=w.enableWatermark,F=w.userNickName,I=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(e){return Object(n.a)(this,a),t.call(this,e)}return Object(c.a)(a,[{key:"render",value:function(){return Object(d.jsxs)("div",{className:"h-100 d-flex flex-column flex-1",children:[Object(d.jsxs)("div",{className:"file-view-header d-flex justify-content-between align-items-center",children:[Object(d.jsxs)("div",{children:[Object(d.jsx)("h2",{className:"file-title",children:k}),Object(d.jsx)("p",{className:"meta-info m-0",children:y?"".concat(Object(p.tb)("Current Path: ")).concat(Object(p.tb)("Trash")):g})]}),N&&Object(d.jsx)(m,{})]}),Object(d.jsx)("div",{className:"file-view-body flex-auto d-flex o-hidden",children:this.props.content})]})}}]),a}(s.a.Component);C&&b.a.init({watermark_txt:"".concat(p.uc," ").concat(F),watermark_alpha:.075});var P=I,D=window.app.pageOptions,E=D.canDownloadFile,T=D.err,S="File preview unsupported",R=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(){return Object(n.a)(this,a),t.apply(this,arguments)}return Object(c.a)(a,[{key:"render",value:function(){var e;return e=T==S||this.props.err==S?Object(d.jsx)("p",{children:Object(p.tb)("Online view is not applicable to this file format")}):Object(d.jsx)("p",{className:"error",children:T}),Object(d.jsx)("div",{className:"file-view-content flex-1 o-auto",children:Object(d.jsxs)("div",{className:"file-view-tip",children:[e,E&&Object(d.jsx)(m,{})]})})}}]),a}(s.a.Component),L=R,_=a(295),J=a(372),M=a(373),U=a(297),V=(a(545),window.app.pageOptions),z=V.fileExt,A=V.fileContent,B=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(){return Object(n.a)(this,a),t.apply(this,arguments)}return Object(c.a)(a,[{key:"render",value:function(){return Object(d.jsx)("div",{className:"file-view-content flex-1 text-file-view",children:Object(d.jsx)(U.a,{fileExt:z,value:A})})}}]),a}(s.a.Component),G=B,W=a(52),q=(a(1721),window.app.pageOptions.fileContent),H=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(){return Object(n.a)(this,a),t.apply(this,arguments)}return Object(c.a)(a,[{key:"render",value:function(){return Object(d.jsx)("div",{className:"file-view-content flex-1 o-auto",children:Object(d.jsx)("div",{className:"md-content",children:Object(d.jsx)(W.d,{markdownContent:q,showTOC:!1,scriptSource:p.Rb+"js/mathjax/tex-svg.js"})})})}}]),a}(s.a.Component),K=H,Q=a(374),X=a(375),Y=window.app.pageOptions,Z=Y.fileType,$=Y.err,ee=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(){return Object(n.a)(this,a),t.apply(this,arguments)}return Object(c.a)(a,[{key:"render",value:function(){if($)return Object(d.jsx)(P,{content:Object(d.jsx)(L,{})});var e;switch(Z){case"Image":e=Object(d.jsx)(_.a,{tip:Object(d.jsx)(L,{})});break;case"SVG":e=Object(d.jsx)(J.a,{});break;case"PDF":e=Object(d.jsx)(M.a,{});break;case"Text":e=Object(d.jsx)(G,{});break;case"Markdown":e=Object(d.jsx)(K,{});break;case"Video":e=Object(d.jsx)(Q.a,{});break;case"Audio":e=Object(d.jsx)(X.a,{});break;default:e=Object(d.jsx)(L,{err:"File preview unsupported"})}return Object(d.jsx)(P,{content:e})}}]),a}(s.a.Component);j.a.render(Object(d.jsx)(ee,{}),document.getElementById("wrapper"))},295:function(e,t,a){"use strict";var n,c,i=a(3),r=a(5),o=a(7),s=a(6),l=a(2),j=a.n(l),u=a(4),b=a(1),p=(a(546),a(0)),d=window.app.pageOptions,f=d.repoID,O=d.repoEncrypted,v=d.fileExt,h=d.filePath,x=d.fileName,m=d.thumbnailSizeForOriginal,w=d.previousImage,y=d.nextImage,k=d.rawPath,g=d.xmindImageSrc;w&&(n="".concat(b.vc,"lib/").concat(f,"/file").concat(u.a.encodePath(w))),y&&(c="".concat(b.vc,"lib/").concat(f,"/file").concat(u.a.encodePath(y)));var N=function(e){Object(o.a)(a,e);var t=Object(s.a)(a);function a(e){var n;return Object(i.a)(this,a),(n=t.call(this,e)).handleLoadFailure=function(){n.setState({loadFailed:!0})},n.state={loadFailed:!1},n}return Object(r.a)(a,[{key:"componentDidMount",value:function(){document.addEventListener("keydown",(function(e){w&&37==e.keyCode&&(location.href=n),y&&39==e.keyCode&&(location.href=c)}))}},{key:"render",value:function(){if(this.state.loadFailed)return this.props.tip;var e="";!O&&["tif","tiff","psd"].includes(v)&&(e="".concat(b.vc,"thumbnail/").concat(f,"/").concat(m).concat(u.a.encodePath(h)));var t=g?"".concat(b.vc).concat(g):"";return Object(p.jsxs)("div",{className:"file-view-content flex-1 image-file-view",children:[w&&Object(p.jsx)("a",{href:n,id:"img-prev",title:Object(b.tb)("you can also press \u2190 "),children:Object(p.jsx)("span",{className:"fas fa-chevron-left"})}),y&&Object(p.jsx)("a",{href:c,id:"img-next",title:Object(b.tb)("you can also press \u2192"),children:Object(p.jsx)("span",{className:"fas fa-chevron-right"})}),Object(p.jsx)("img",{src:t||e||k,alt:x,id:"image-view",onError:this.handleLoadFailure})]})}}]),a}(j.a.Component);t.a=N},372:function(e,t,a){"use strict";var n=a(3),c=a(5),i=a(7),r=a(6),o=a(2),s=a.n(o),l=(a(548),a(0)),j=window.app.pageOptions,u=j.fileName,b=j.rawPath,p=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(){return Object(n.a)(this,a),t.apply(this,arguments)}return Object(c.a)(a,[{key:"render",value:function(){return Object(l.jsx)("div",{className:"file-view-content flex-1 svg-file-view",children:Object(l.jsx)("img",{src:b,alt:u,id:"svg-view"})})}}]),a}(s.a.Component);t.a=p},373:function(e,t,a){"use strict";var n=a(3),c=a(5),i=a(7),r=a(6),o=a(2),s=a.n(o),l=a(183),j=(a(348),a(0)),u=function(e){Object(i.a)(a,e);var t=Object(r.a)(a);function a(){return Object(n.a)(this,a),t.apply(this,arguments)}return Object(c.a)(a,[{key:"render",value:function(){return Object(j.jsx)("div",{className:"file-view-content flex-1 pdf-file-view",children:Object(j.jsx)(l.a,{})})}}]),a}(s.a.Component);t.a=u},374:function(e,t,a){"use strict";var n=a(17),c=a(3),i=a(5),r=a(7),o=a(6),s=a(2),l=a.n(s),j=a(293),u=(a(547),a(0)),b=window.app.pageOptions.rawPath,p=function(e){Object(r.a)(a,e);var t=Object(o.a)(a);function a(){return Object(c.a)(this,a),t.apply(this,arguments)}return Object(i.a)(a,[{key:"render",value:function(){var e={autoplay:!1,controls:!0,preload:"auto",playbackRates:[.5,1,1.5,2],sources:[{src:b}]};return Object(u.jsx)("div",{className:"file-view-content flex-1 video-file-view",children:Object(u.jsx)(j.a,Object(n.a)({},e))})}}]),a}(l.a.Component);t.a=p},375:function(e,t,a){"use strict";var n=a(17),c=a(3),i=a(5),r=a(7),o=a(6),s=a(2),l=a.n(s),j=a(294),u=(a(549),a(0)),b=window.app.pageOptions.rawPath,p=function(e){Object(r.a)(a,e);var t=Object(o.a)(a);function a(){return Object(c.a)(this,a),t.apply(this,arguments)}return Object(i.a)(a,[{key:"render",value:function(){var e={autoplay:!1,controls:!0,preload:"auto",sources:[{src:b}]};return Object(u.jsx)("div",{className:"file-view-content flex-1 audio-file-view",children:Object(u.jsx)(j.a,Object(n.a)({},e))})}}]),a}(l.a.Component);t.a=p}},[[1720,1,0]]]);
//# sourceMappingURL=historyTrashFileView.chunk.js.map