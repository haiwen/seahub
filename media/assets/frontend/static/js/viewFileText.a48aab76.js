"use strict";(self.webpackChunkseahub_frontend=self.webpackChunkseahub_frontend||[]).push([[425],{37798:function(t,n,e){var i=e(97326),a=e(15671),s=e(43144),r=e(60136),c=e(29388),o=e(47313),u=e(1168),p=e(68396),d=e(61805),h=e(38130),v=e(90930),f=e(15254),l=e(4514),S=e(83854),g=(e(85387),e(46417)),P=window.app.pageOptions,C=P.err,Z=P.fileExt,m=P.fileContent,x=P.repoID,k=P.filePath,y=P.fileName,w=P.canEditFile,j=P.username,I=function(t){(0,r.Z)(e,t);var n=(0,c.Z)(e);function e(){return(0,a.Z)(this,e),n.apply(this,arguments)}return(0,s.Z)(e,[{key:"render",value:function(){return C?(0,g.jsx)(f.Z,{}):(0,g.jsx)("div",{className:"file-view-content flex-1 text-file-view",children:(0,g.jsx)(v.Z,{fileExt:Z,value:this.props.content,readOnly:!w,onChange:this.props.updateContent})})}}]),e}(o.Component),b=function(t){(0,r.Z)(e,t);var n=(0,c.Z)(e);function e(t){var s;return(0,a.Z)(this,e),(s=n.call(this,t)).updateContent=function(t){s.setState({needSave:!0,content:t})},s.addParticipant=function(){l.I.addFileParticipants(x,k,[j]).then((function(t){200===t.status&&(s.isParticipant=!0,s.getParticipants())}))},s.getParticipants=function(){l.I.listFileParticipants(x,k).then((function(t){var n=t.data.participant_list;s.setState({participants:n}),n.length>0&&(s.isParticipant=n.every((function(t){return t.email==j})))}))},s.onParticipantsChange=function(){s.getParticipants()},s.state={content:m,needSave:!1,isSaving:!1,participants:[]},s.onSave=s.onSave.bind((0,i.Z)(s)),s.isParticipant=!1,s}return(0,s.Z)(e,[{key:"onSave",value:function(){var t=this;this.isParticipant||this.addParticipant();var n=S.c.getDirName(k);return l.I.getUpdateLink(x,n).then((function(n){var e=n.data;return t.setState({isSaving:!0}),l.I.updateFile(e,k,y,t.state.content).then((function(){p.Z.success((0,d.ih)("Successfully saved"),{duration:2}),t.setState({isSaving:!1,needSave:!1})}))}))}},{key:"componentDidMount",value:function(){this.getParticipants()}},{key:"render",value:function(){return(0,g.jsx)(h.Z,{content:(0,g.jsx)(I,{content:this.state.content,updateContent:this.updateContent}),isSaving:this.state.isSaving,needSave:this.state.needSave,onSave:this.onSave,participants:this.state.participants,onParticipantsChange:this.onParticipantsChange})}}]),e}(o.Component);u.render((0,g.jsx)(b,{}),document.getElementById("wrapper"))}},function(t){t.O(0,[351],(function(){return n=37798,t(t.s=n);var n}));t.O()}]);