"use strict";(self.webpackChunkseahub_frontend=self.webpackChunkseahub_frontend||[]).push([[500],{40301:function(e,n,o){var a=o(47313),r=o(1168),s=o(88529),c=o(72970),t=o(12409),i=o(51282),d=o(83854),p=o(46417),l=window.app.config,u=l.serviceURL,f=l.siteRoot,h=l.avatarURL,m=window.app.pageOptions.username,w=window.shared.pageOptions,U=w.repoID,v=w.filePerm,k=w.canDownload,g=w.canEdit,L=w.trafficOverLimit,R=w.zipped,P=w.docPath,S=w.docName,x=w.docUuid,I=w.seadocAccessToken,O=w.seadocServerUrl,b=w.assetsUrl,j={can_edit:g,can_download:k,can_upload:!1},_=d.c.getShareLinkPermissionStr(j),y=d.c.getShareLinkPermissionObject(_).text;window.seafile={repoID:U,docPath:P,docName:S,docUuid:x,isOpenSocket:!0,serviceUrl:u,accessToken:I,sdocServer:O,username:m,avatarURL:h,siteRoot:f,sharePermissionText:y,downloadURL:k&&!L?"?".concat(R?"p="+encodeURIComponent(P)+"&":"","dl=1"):"",docPerm:v,historyURL:d.c.generateHistoryURL(f,U,P),assetsUrl:b},function(){var e=d.c.getFileIconUrl(S,192);document.getElementById("favicon").href=e}(),r.render((0,p.jsx)(c.I18nextProvider,{i18n:t.Z,children:(0,p.jsx)(a.Suspense,{fallback:(0,p.jsx)(i.Z,{}),children:(0,p.jsx)(s.S4,{})})}),document.getElementById("wrapper"))}},function(e){e.O(0,[351],(function(){return n=40301,e(e.s=n);var n}));e.O()}]);