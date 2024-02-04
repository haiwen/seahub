(this["webpackJsonpseahub-frontend"]=this["webpackJsonpseahub-frontend"]||[]).push([[18],{1730:function(e,t,a){a(76),e.exports=a(1752)},1731:function(e,t,a){},1752:function(e,t,a){"use strict";a.r(t);var n=a(3),s=a(5),c=a(7),i=a(6),o=a(2),r=a.n(o),l=a(31),b=a.n(l),d=a(21),h=a(4),j=a(1),u=a(8),m=a(10),O=a(70),p=a(0),g=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){return Object(n.a)(this,a),t.call(this,e)}return Object(s.a)(a,[{key:"render",value:function(){var e=this;return Object(p.jsx)("ul",{className:"nav flex-column user-setting-nav",children:this.props.data.map((function(t,a){return t.show?Object(p.jsx)("li",{className:"nav-item".concat(e.props.curItemID==t.href.substr(1)?" active":""),children:Object(p.jsx)("a",{className:"nav-link",href:t.href,children:t.text})},a):null}))})}}]),a}(r.a.Component),f=window.app.pageOptions,v=f.avatarURL,x=f.csrfToken,w=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).fileInputChange=function(){if(s.fileInput.current.files.length){var e=s.fileInput.current.files[0],t=e.name;if(-1==t.lastIndexOf("."))return m.a.danger(Object(j.tb)("Please choose an image file."),{duration:5}),!1;var a=t.substr(t.lastIndexOf(".")+1).toLowerCase(),n=["jpg","jpeg","png","gif"];if(-1==n.indexOf(a)){var c=Object(j.tb)("File extensions can only be {placeholder}.").replace("{placeholder}",n.join(", "));return m.a.danger(c,{duration:5}),!1}if(e.size>1048576){var i=Object(j.tb)("The file is too large. Allowed maximum size is 1MB.");return m.a.danger(i,{duration:5}),!1}u.a.updateUserAvatar(e,160).then((function(e){s.setState({avatarSrc:e.data.avatar_url}),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))}},s.openFileInput=function(){s.fileInput.current.click()},s.handleMouseOver=function(){s.setState({isEditShown:!0})},s.handleMouseOut=function(){s.setState({isEditShown:!1})},s.onEditIconKeyDown=function(e){"Enter"!=e.key&&"Space"!=e.key||e.target.click()},s.state={avatarSrc:v,isEditShown:!1},s.fileInput=r.a.createRef(),s.form=r.a.createRef(),s}return Object(s.a)(a,[{key:"render",value:function(){return Object(p.jsxs)("form",{ref:this.form,className:"form-group row",encType:"multipart/form-data",method:"post",action:"".concat(j.vc,"avatar/add/"),children:[Object(p.jsx)("input",{type:"hidden",name:"csrfmiddlewaretoken",value:x}),Object(p.jsx)("label",{className:"col-sm-1 col-form-label",children:Object(j.tb)("Avatar:")}),Object(p.jsxs)("div",{className:"col-auto position-relative",onMouseOver:this.handleMouseOver,onMouseOut:this.handleMouseOut,onFocus:this.handleMouseOver,tabIndex:"0",children:[Object(p.jsx)("img",{src:this.state.avatarSrc,width:"80",height:"80",alt:"",className:"user-avatar"}),Object(p.jsx)("input",{type:"file",name:"avatar",className:"d-none",onChange:this.fileInputChange,ref:this.fileInput}),Object(p.jsx)("span",{className:"avatar-edit fas fa-edit ".concat(!this.state.isEditShown&&"d-none"),onClick:this.openFileInput,role:"button","aria-label":Object(j.tb)("Edit"),tabIndex:"0",onKeyDown:this.onEditIconKeyDown})]})]})}}]),a}(r.a.Component),k=window.app.pageOptions,S=k.nameLabel,y=k.enableUpdateUserInfo,C=k.enableUserSetContactEmail,D=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;Object(n.a)(this,a),(s=t.call(this,e)).handleNameInputChange=function(e){s.setState({name:e.target.value})},s.handleContactEmailInputChange=function(e){s.setState({contactEmail:e.target.value})},s.handleSubmit=function(e){e.preventDefault();var t={name:s.state.name};C&&(t.contact_email=s.state.contactEmail),s.props.updateUserInfo(t)};var c=s.props.userInfo,i=c.contact_email,o=c.login_id,r=c.name;return s.state={contactEmail:i,loginID:o,name:r},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.state,t=e.contactEmail,a=e.loginID,n=e.name;return Object(p.jsxs)("form",{action:"",method:"post",onSubmit:this.handleSubmit,children:[Object(p.jsxs)("div",{className:"form-group row",children:[Object(p.jsx)("label",{className:"col-sm-1 col-form-label",htmlFor:"name",children:S}),Object(p.jsx)("div",{className:"col-sm-5",children:Object(p.jsx)("input",{className:"form-control",id:"name",type:"text",name:"nickname",value:n,disabled:!y,onChange:this.handleNameInputChange})})]}),a&&Object(p.jsxs)("div",{className:"form-group row",children:[Object(p.jsx)("label",{className:"col-sm-1 col-form-label",htmlFor:"user-name",children:Object(j.tb)("Username:")}),Object(p.jsx)("div",{className:"col-sm-5",children:Object(p.jsx)("input",{className:"form-control",id:"user-name",type:"text",name:"username",value:a,disabled:!0,readOnly:!0})}),Object(p.jsx)("p",{className:"col-sm-5 m-0 input-tip",children:Object(j.tb)("You can use this field at login.")})]}),(t||C)&&Object(p.jsxs)("div",{className:"form-group row",children:[Object(p.jsx)("label",{className:"col-sm-1 col-form-label",htmlFor:"contact-email",children:Object(j.tb)("Contact Email:")}),Object(p.jsx)("div",{className:"col-sm-5",children:Object(p.jsx)("input",{className:"form-control",id:"contact-email",type:"text",name:"contact_email",value:t,disabled:!C,readOnly:!C,onChange:this.handleContactEmailInputChange})}),Object(p.jsx)("p",{className:"col-sm-5 m-0 input-tip",children:Object(j.tb)("Your notifications will be sent to this email.")})]}),Object(p.jsx)("button",{type:"submit",className:"btn btn-outline-primary offset-sm-1",disabled:!y,children:Object(j.tb)("Submit")})]})}}]),a}(r.a.Component),N=a(23),I=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).getAuthToken=function(){u.a.getAuthTokenBySession().then((function(e){s.setState({authToken:e.data.token})})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))},s.createAuthToken=function(){u.a.createAuthTokenBySession().then((function(e){s.setState({authToken:e.data.token,isAuthTokenVisible:!1}),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))},s.deleteAuthToken=function(){u.a.deleteAuthTokenBySession().then((function(e){s.setState({authToken:"",isAuthTokenVisible:!1}),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))},s.toggleAuthTokenVisible=function(){s.setState({isAuthTokenVisible:!s.state.isAuthTokenVisible})},s.onIconKeyDown=function(e){"Enter"!=e.key&&"Space"!=e.key||e.target.click()},s.state={authToken:"",isAuthTokenVisible:!1},s}return Object(s.a)(a,[{key:"componentDidMount",value:function(){this.getAuthToken()}},{key:"render",value:function(){var e=this.state,t=e.authToken,a=e.isAuthTokenVisible;return Object(p.jsx)(r.a.Fragment,{children:Object(p.jsxs)("div",{id:"get-auth-token",className:"setting-item",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Web API Auth Token")}),t?Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("div",{className:"d-flex align-items-center",children:[Object(p.jsx)("label",{className:"m-0 mr-2",htmlFor:"token",children:Object(j.tb)("Token:")}),Object(p.jsx)("input",{id:"token",className:"border-0 mr-1",type:"text",value:a?t:"****************************************",readOnly:!0,size:Math.max(t.length,10)}),Object(p.jsx)("span",{tabIndex:"0",role:"button","aria-label":a?Object(j.tb)("Hide"):Object(j.tb)("Show"),onKeyDown:this.onIconKeyDown,onClick:this.toggleAuthTokenVisible,className:"eye-icon fas ".concat(this.state.isAuthTokenVisible?"fa-eye":"fa-eye-slash")})]}),Object(p.jsx)("button",{className:"btn btn-outline-primary mt-2",onClick:this.deleteAuthToken,children:Object(j.tb)("Delete")})]}):Object(p.jsx)("button",{className:"btn btn-outline-primary",onClick:this.createAuthToken,children:Object(j.tb)("Generate")})]})})}}]),a}(r.a.Component),P=a(121),A=a(106),T=a(107),E=a(1769),M=a(441),R=a(1770),L=a(83),U=a(1e3),V=a(143),F=window.app.pageOptions,W=F.webdavSecretMinLength,_=F.webdavSecretStrengthLevel,B=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).submit=function(){return 0===s.state.password.length?(s.setState({errMsg:Object(j.tb)("Please enter a password.")}),!1):s.state.password.length<W?(s.setState({errMsg:Object(j.tb)("The password is too short.")}),!1):h.a.getStrengthLevel(s.state.password)<_?(s.setState({errMsg:Object(j.tb)("The password is too weak. It should include at least {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols.").replace("{passwordStrengthLevel}",_)}),!1):(s.setState({btnDisabled:!0}),void s.props.setPassword(s.state.password.trim()))},s.handleInputChange=function(e){s.setState({password:e.target.value})},s.togglePasswordVisible=function(){s.setState({isPasswordVisible:!s.state.isPasswordVisible})},s.generatePassword=function(){var e=h.a.generatePassword(W);s.setState({password:e})},s.state={password:"",isPasswordVisible:!1,btnDisabled:!1,errMsg:""},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.props.toggle,t=Object(j.tb)("(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)").replace("{passwordMinLength}",W).replace("{passwordStrengthLevel}",_);return Object(p.jsxs)(P.a,{centered:!0,isOpen:!0,toggle:e,children:[Object(p.jsx)(A.a,{toggle:e,children:Object(j.tb)("Set WebDAV Password")}),Object(p.jsxs)(T.a,{children:[Object(p.jsxs)(E.a,{children:[Object(p.jsx)(M.a,{type:this.state.isPasswordVisible?"text":"password",value:this.state.password,onChange:this.handleInputChange,autoComplete:"new-password"}),Object(p.jsxs)(R.a,{addonType:"append",children:[Object(p.jsx)(L.a,{onClick:this.togglePasswordVisible,children:Object(p.jsx)("i",{className:"fas ".concat(this.state.isPasswordVisible?"fa-eye":"fa-eye-slash")})}),Object(p.jsx)(L.a,{onClick:this.generatePassword,children:Object(p.jsx)("i",{className:"fas fa-magic"})})]})]}),Object(p.jsx)("p",{className:"form-text text-muted m-0",children:t}),this.state.errMsg&&Object(p.jsx)(U.a,{color:"danger",className:"m-0 mt-2",children:Object(j.tb)(this.state.errMsg)})]}),Object(p.jsxs)(V.a,{children:[Object(p.jsx)(L.a,{color:"secondary",onClick:e,children:Object(j.tb)("Cancel")}),Object(p.jsx)(L.a,{color:"primary",onClick:this.submit,disabled:this.state.btnDisabled,children:Object(j.tb)("Submit")})]})]})}}]),a}(o.Component),K=window.app.pageOptions,z=K.webdavSecretMinLength,G=K.webdavSecretStrengthLevel,Y=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).submit=function(){return 0===s.state.password.length?(s.setState({errMsg:Object(j.tb)("Please enter a password.")}),!1):s.state.password.length<z?(s.setState({errMsg:Object(j.tb)("The password is too short.")}),!1):h.a.getStrengthLevel(s.state.password)<G?(s.setState({errMsg:Object(j.tb)("The password is too weak. It should include at least {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols.").replace("{passwordStrengthLevel}",G)}),!1):(s.setState({btnDisabled:!0}),void s.props.resetPassword(s.state.password.trim()))},s.handleInputChange=function(e){s.setState({password:e.target.value})},s.togglePasswordVisible=function(){s.setState({isPasswordVisible:!s.state.isPasswordVisible})},s.generatePassword=function(){var e=h.a.generatePassword(z);s.setState({password:e})},s.state={password:"",isPasswordVisible:!1,btnDisabled:!1,errMsg:""},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.props.toggle,t=Object(j.tb)("(at least {passwordMinLength} characters and includes {passwordStrengthLevel} of the following: number, upper letter, lower letter and other symbols)").replace("{passwordMinLength}",z).replace("{passwordStrengthLevel}",G);return Object(p.jsxs)(P.a,{centered:!0,isOpen:!0,toggle:e,children:[Object(p.jsx)(A.a,{toggle:e,children:Object(j.tb)("Reset WebDAV Password")}),Object(p.jsxs)(T.a,{children:[Object(p.jsxs)(E.a,{children:[Object(p.jsx)(M.a,{type:this.state.isPasswordVisible?"text":"password",value:this.state.password,onChange:this.handleInputChange,autoComplete:"new-password"}),Object(p.jsxs)(R.a,{addonType:"append",children:[Object(p.jsx)(L.a,{onClick:this.togglePasswordVisible,children:Object(p.jsx)("i",{className:"fas ".concat(this.state.isPasswordVisible?"fa-eye":"fa-eye-slash")})}),Object(p.jsx)(L.a,{onClick:this.generatePassword,children:Object(p.jsx)("i",{className:"fas fa-magic"})})]})]}),Object(p.jsx)("p",{className:"form-text text-muted m-0",children:t}),this.state.errMsg&&Object(p.jsx)(U.a,{color:"danger",className:"m-0 mt-2",children:Object(j.tb)(this.state.errMsg)})]}),Object(p.jsxs)(V.a,{children:[Object(p.jsx)(L.a,{color:"secondary",onClick:e,children:Object(j.tb)("Cancel")}),Object(p.jsx)(L.a,{color:"primary",onClick:this.submit,disabled:this.state.btnDisabled,children:Object(j.tb)("Submit")})]})]})}}]),a}(o.Component),J=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).submit=function(){s.setState({btnDisabled:!0}),s.props.removePassword()},s.state={btnDisabled:!1},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.props.toggle;return Object(p.jsxs)(P.a,{centered:!0,isOpen:!0,toggle:e,children:[Object(p.jsx)(A.a,{toggle:e,children:Object(j.tb)("Delete WebDAV Password")}),Object(p.jsx)(T.a,{children:Object(p.jsx)("p",{children:Object(j.tb)("Are you sure you want to delete WebDAV password?")})}),Object(p.jsxs)(V.a,{children:[Object(p.jsx)(L.a,{color:"secondary",onClick:e,children:Object(j.tb)("Cancel")}),Object(p.jsx)(L.a,{color:"primary",onClick:this.submit,disabled:this.state.btnDisabled,children:Object(j.tb)("Delete")})]})]})}}]),a}(o.Component),H=window.app.pageOptions,q=H.username,Q=H.webdavUrl,X=H.webdavPasswordSetted,Z=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).toggleSetPasswordDialog=function(){s.setState({isSetPasserdDialogOpen:!s.state.isSetPasserdDialogOpen})},s.setPassword=function(e){u.a.updateWebdavSecret(e).then((function(e){s.toggleSetPasswordDialog(),s.setState({isWebdavPasswordSetted:!s.state.isWebdavPasswordSetted}),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);s.toggleSetPasswordDialog(),m.a.danger(t)}))},s.toggleResetPasswordDialog=function(){s.setState({isResetPasswordDialogOpen:!s.state.isResetPasswordDialogOpen})},s.resetPassword=function(e){u.a.updateWebdavSecret(e).then((function(e){s.toggleResetPasswordDialog(),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);s.toggleResetPasswordDialog(),m.a.danger(t)}))},s.toggleRemovePasswordDialog=function(){s.setState({isRemovePasswordDialogOpen:!s.state.isRemovePasswordDialogOpen})},s.removePassword=function(){u.a.updateWebdavSecret().then((function(e){s.toggleRemovePasswordDialog(),s.setState({isWebdavPasswordSetted:!s.state.isWebdavPasswordSetted}),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);s.toggleRemovePasswordDialog(),m.a.danger(t)}))},s.onIconKeyDown=function(e){"Enter"!=e.key&&"Space"!=e.key||e.target.click()},s.state={isWebdavPasswordSetted:X,isSetPasserdDialogOpen:!1,isResetPasserdDialogOpen:!1,isRemovePasserdDialogOpen:!1},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.state.isWebdavPasswordSetted;return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("div",{id:"update-webdav-passwd",className:"setting-item",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("WebDAV Password")}),Object(p.jsxs)("p",{children:["WebDAV URL: ",Object(p.jsx)("a",{href:Q,children:Q})]}),Object(p.jsxs)("p",{children:[Object(j.tb)("WebDAV username:")," ",q]}),e?Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("p",{children:[Object(j.tb)("WebDAV password:")," ***"]}),Object(p.jsx)("button",{className:"btn btn-outline-primary mr-2",onClick:this.toggleResetPasswordDialog,children:Object(j.tb)("Reset Password")}),Object(p.jsx)("button",{className:"btn btn-outline-primary",onClick:this.toggleRemovePasswordDialog,children:Object(j.tb)("Delete Password")})]}):Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("p",{children:[Object(j.tb)("WebDAV password:")," ",Object(j.tb)("not set")]}),Object(p.jsx)("button",{className:"btn btn-outline-primary",onClick:this.toggleSetPasswordDialog,children:Object(j.tb)("Set Password")})]})]}),this.state.isSetPasserdDialogOpen&&Object(p.jsx)(N.a,{children:Object(p.jsx)(B,{setPassword:this.setPassword,toggle:this.toggleSetPasswordDialog})}),this.state.isResetPasswordDialogOpen&&Object(p.jsx)(N.a,{children:Object(p.jsx)(Y,{resetPassword:this.resetPassword,toggle:this.toggleResetPasswordDialog})}),this.state.isRemovePasswordDialogOpen&&Object(p.jsx)(N.a,{children:Object(p.jsx)(J,{removePassword:this.removePassword,toggle:this.toggleRemovePasswordDialog})})]})}}]),a}(r.a.Component),$=a(112),ee=window.app.pageOptions,te=ee.currentLang,ae=ee.langList,ne=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).onSelectChange=function(e){location.href="".concat(j.vc,"i18n/?lang=").concat(e.value)},s}return Object(s.a)(a,[{key:"render",value:function(){var e=ae.map((function(e,t){return{value:e.langCode,label:e.langName}}));return Object(p.jsxs)("div",{className:"setting-item",id:"lang-setting",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Language Setting")}),Object(p.jsx)($.a,{className:"language-selector",defaultValue:{value:te.langCode,label:te.langName},options:e,onChange:this.onSelectChange})]})}}]),a}(r.a.Component),se=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;Object(n.a)(this,a),(s=t.call(this,e)).handleInputChange=function(e){var t=e.target.checked;s.setState({inputChecked:t}),s.props.updateUserInfo({list_in_address_book:t.toString()})};var c=s.props.userInfo.list_in_address_book;return s.state={inputChecked:c},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.state.inputChecked;return Object(p.jsxs)("div",{className:"setting-item",id:"list-in-address-book",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Global Address Book")}),Object(p.jsxs)("div",{className:"d-flex align-items-center",children:[Object(p.jsx)("input",{type:"checkbox",id:"list-in-address-book",name:"list_in_address_book",className:"mr-1",checked:e,onChange:this.handleInputChange}),Object(p.jsx)("label",{htmlFor:"list-in-address-book",className:"m-0",children:Object(j.tb)("List your account in global address book, so that others can find you by typing your name.")})]})]})}}]),a}(r.a.Component),ce=window.app.pageOptions,ie=ce.fileUpdatesEmailInterval,oe=ce.collaborateEmailInterval,re=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).inputFileUpdatesEmailIntervalChange=function(e){e.target.checked&&s.setState({fileUpdatesEmailInterval:parseInt(e.target.value)})},s.inputCollaborateEmailIntervalChange=function(e){e.target.checked&&s.setState({collaborateEmailInterval:parseInt(e.target.value)})},s.formSubmit=function(e){e.preventDefault();var t=s.state,a=t.fileUpdatesEmailInterval,n=t.collaborateEmailInterval;u.a.updateEmailNotificationInterval(a,n).then((function(e){m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))},s.fileUpdatesOptions=[{interval:0,text:Object(j.tb)("Don't send emails")},{interval:3600,text:Object(j.tb)("Per hour")},{interval:14400,text:Object(j.tb)("Per 4 hours")},{interval:86400,text:Object(j.tb)("Per day")},{interval:604800,text:Object(j.tb)("Per week")}],s.collaborateOptions=[{interval:0,text:Object(j.tb)("Don't send emails")},{interval:3600,text:Object(j.tb)("Per hour")+" ("+Object(j.tb)("If notifications have not been read within one hour, they will be sent to your mailbox.")+")"}],s.state={fileUpdatesEmailInterval:ie,collaborateEmailInterval:oe},s}return Object(s.a)(a,[{key:"render",value:function(){var e=this,t=this.state,a=t.fileUpdatesEmailInterval,n=t.collaborateEmailInterval;return Object(p.jsxs)("div",{className:"setting-item",id:"email-notice",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Email Notification")}),Object(p.jsx)("h6",{className:"",children:Object(j.tb)("Notifications of file changes")}),Object(p.jsx)("p",{className:"mb-1",children:Object(j.tb)("The list of added, deleted and modified files will be sent to your mailbox.")}),Object(p.jsx)("form",{method:"post",action:"",id:"set-email-notice-interval-form",onSubmit:this.formSubmit,children:this.fileUpdatesOptions.map((function(t,n){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsx)("input",{type:"radio",name:"interval",value:t.interval,className:"align-middle",id:"file-updates-interval-option".concat(n+1),checked:a==t.interval,onChange:e.inputFileUpdatesEmailIntervalChange}),Object(p.jsx)("label",{className:"align-middle m-0 ml-2",htmlFor:"interval-option".concat(n+1),children:t.text}),Object(p.jsx)("br",{})]},"file-updates-".concat(n))}))}),Object(p.jsx)("h6",{className:"mt-4",children:Object(j.tb)("Notifications of collaboration")}),Object(p.jsx)("p",{className:"mb-1",children:Object(j.tb)("Whether the notifications of collaboration such as sharing library or joining group should be sent to your mailbox.")}),Object(p.jsx)("form",{method:"post",action:"",id:"set-email-notice-interval-form",onSubmit:this.formSubmit,children:this.collaborateOptions.map((function(t,a){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsx)("input",{type:"radio",name:"interval",value:t.interval,className:"align-middle",id:"collaborate-interval-option".concat(a+1),checked:n==t.interval,onChange:e.inputCollaborateEmailIntervalChange}),Object(p.jsx)("label",{className:"align-middle m-0 ml-2",htmlFor:"interval-option".concat(a+1),children:t.text}),Object(p.jsx)("br",{})]},"collaborate-".concat(a))}))}),Object(p.jsx)("button",{type:"submit",className:"btn btn-outline-primary mt-2",onClick:this.formSubmit,children:Object(j.tb)("Submit")})]})}}]),a}(r.a.Component),le=window.app.pageOptions,be=le.defaultDevice,de=le.backupTokens,he=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).renderEnabled=function(){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsx)("p",{className:"mb-2",children:Object(j.tb)("Status: enabled")}),Object(p.jsx)("a",{className:"btn btn-outline-primary mb-4",href:"".concat(j.vc,"profile/two_factor_authentication/disable/"),children:Object(j.tb)("Disable Two-Factor Authentication")}),Object(p.jsxs)("p",{className:"mb-2",children:[Object(j.tb)("If you don't have any device with you, you can access your account using backup codes."),1==de?Object(j.tb)("You have only one backup code remaining."):Object(j.tb)("You have {num} backup codes remaining.").replace("{num}",de)]}),Object(p.jsx)("a",{href:"".concat(j.vc,"profile/two_factor_authentication/backup/tokens/"),className:"btn btn-outline-primary",children:Object(j.tb)("Show Codes")})]})},s.renderDisabled=function(){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsx)("p",{className:"mb-2",children:Object(j.tb)("Two-factor authentication is not enabled for your account. Enable two-factor authentication for enhanced account security.")}),Object(p.jsx)("a",{href:"".concat(j.vc,"profile/two_factor_authentication/setup/"),className:"btn btn-outline-primary",children:Object(j.tb)("Enable Two-Factor Authentication")})]})},s}return Object(s.a)(a,[{key:"render",value:function(){return Object(p.jsxs)("div",{className:"setting-item",id:"two-factor-auth",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Two-Factor Authentication")}),be?this.renderEnabled():this.renderDisabled()]})}}]),a}(r.a.Component),je=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).disconnect=function(){s.form.current.submit()},s.form=r.a.createRef(),s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.props,t=e.formActionURL,a=e.csrfToken,n=e.toggle;return Object(p.jsxs)(P.a,{centered:!0,isOpen:!0,toggle:n,children:[Object(p.jsx)(A.a,{toggle:n,children:Object(j.tb)("Disconnect")}),Object(p.jsxs)(T.a,{children:[Object(p.jsx)("p",{children:Object(j.tb)("Are you sure you want to disconnect?")}),Object(p.jsx)("form",{ref:this.form,className:"d-none",method:"post",action:t,children:Object(p.jsx)("input",{type:"hidden",name:"csrfmiddlewaretoken",value:a})})]}),Object(p.jsxs)(V.a,{children:[Object(p.jsx)(L.a,{color:"secondary",onClick:n,children:Object(j.tb)("Cancel")}),Object(p.jsx)(L.a,{color:"primary",onClick:this.disconnect,children:Object(j.tb)("Disconnect")})]})]})}}]),a}(o.Component),ue=window.app.pageOptions,me=ue.csrfToken,Oe=ue.langCode,pe=ue.socialConnected,ge=ue.socialNextPage,fe=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).confirmDisconnect=function(){s.setState({isConfirmDialogOpen:!0})},s.toggleDialog=function(){s.setState({isConfirmDialogOpen:!s.state.isConfirmDialogOpen})},s.state={isConfirmDialogOpen:!1},s}return Object(s.a)(a,[{key:"render",value:function(){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("div",{className:"setting-item",id:"social-auth",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Social Login")}),Object(p.jsx)("p",{className:"mb-2",children:"zh-cn"==Oe?"\u4f01\u4e1a\u5fae\u4fe1":"WeChat Work"}),pe?Object(p.jsx)("button",{className:"btn btn-outline-primary",onClick:this.confirmDisconnect,children:Object(j.tb)("Disconnect")}):Object(p.jsx)("a",{href:"".concat(j.vc,"work-weixin/oauth-connect/?next=").concat(encodeURIComponent(ge)),className:"btn btn-outline-primary",children:Object(j.tb)("Connect")})]}),this.state.isConfirmDialogOpen&&Object(p.jsx)(N.a,{children:Object(p.jsx)(je,{formActionURL:"".concat(j.vc,"work-weixin/oauth-disconnect/?next=").concat(encodeURIComponent(ge)),csrfToken:me,toggle:this.toggleDialog})})]})}}]),a}(r.a.Component),ve=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).disconnect=function(){s.form.current.submit()},s.form=r.a.createRef(),s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.props,t=e.formActionURL,a=e.csrfToken,n=e.toggle;return Object(p.jsxs)(P.a,{centered:!0,isOpen:!0,toggle:n,children:[Object(p.jsx)(A.a,{toggle:n,children:Object(j.tb)("Disconnect")}),Object(p.jsxs)(T.a,{children:[Object(p.jsx)("p",{children:Object(j.tb)("Are you sure you want to disconnect?")}),Object(p.jsx)("form",{ref:this.form,className:"d-none",method:"post",action:t,children:Object(p.jsx)("input",{type:"hidden",name:"csrfmiddlewaretoken",value:a})})]}),Object(p.jsxs)(V.a,{children:[Object(p.jsx)(L.a,{color:"secondary",onClick:n,children:Object(j.tb)("Cancel")}),Object(p.jsx)(L.a,{color:"primary",onClick:this.disconnect,children:Object(j.tb)("Disconnect")})]})]})}}]),a}(o.Component),xe=window.app.pageOptions,we=xe.csrfToken,ke=xe.langCode,Se=xe.socialConnectedDingtalk,ye=xe.socialNextPage,Ce=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).confirmDisconnect=function(){s.setState({isConfirmDialogOpen:!0})},s.toggleDialog=function(){s.setState({isConfirmDialogOpen:!s.state.isConfirmDialogOpen})},s.state={isConfirmDialogOpen:!1},s}return Object(s.a)(a,[{key:"render",value:function(){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("div",{className:"setting-item",id:"social-auth",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Social Login")}),Object(p.jsx)("p",{className:"mb-2",children:"zh-cn"==ke?"\u9489\u9489":"Dingtalk"}),Se?Object(p.jsx)("button",{className:"btn btn-outline-primary",onClick:this.confirmDisconnect,children:Object(j.tb)("Disconnect")}):Object(p.jsx)("a",{href:"".concat(j.vc,"dingtalk/connect/?next=").concat(encodeURIComponent(ye)),className:"btn btn-outline-primary",children:Object(j.tb)("Connect")})]}),this.state.isConfirmDialogOpen&&Object(p.jsx)(N.a,{children:Object(p.jsx)(ve,{formActionURL:"".concat(j.vc,"dingtalk/disconnect/?next=").concat(encodeURIComponent(ye)),csrfToken:we,toggle:this.toggleDialog})})]})}}]),a}(r.a.Component),De=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).action=function(){s.form.current.submit()},s.form=r.a.createRef(),s}return Object(s.a)(a,[{key:"render",value:function(){var e=this.props,t=e.formActionURL,a=e.csrfToken,n=e.toggle;return Object(p.jsxs)(P.a,{centered:!0,isOpen:!0,toggle:n,children:[Object(p.jsx)(A.a,{toggle:n,children:Object(j.tb)("Delete Account")}),Object(p.jsxs)(T.a,{children:[Object(p.jsx)("p",{children:Object(j.tb)("Really want to delete your account?")}),Object(p.jsx)("form",{ref:this.form,className:"d-none",method:"post",action:t,children:Object(p.jsx)("input",{type:"hidden",name:"csrfmiddlewaretoken",value:a})})]}),Object(p.jsxs)(V.a,{children:[Object(p.jsx)(L.a,{color:"secondary",onClick:n,children:Object(j.tb)("Cancel")}),Object(p.jsx)(L.a,{color:"primary",onClick:this.action,children:Object(j.tb)("Delete")})]})]})}}]),a}(o.Component),Ne=window.app.pageOptions.csrfToken,Ie=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).confirmDelete=function(e){e.preventDefault(),s.setState({isConfirmDialogOpen:!0})},s.toggleDialog=function(){s.setState({isConfirmDialogOpen:!s.state.isConfirmDialogOpen})},s.state={isConfirmDialogOpen:!1},s}return Object(s.a)(a,[{key:"render",value:function(){return Object(p.jsxs)(r.a.Fragment,{children:[Object(p.jsxs)("div",{className:"setting-item",id:"del-account",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Delete Account")}),Object(p.jsx)("p",{className:"mb-2",children:Object(j.tb)("This operation will not be reverted. Please think twice!")}),Object(p.jsx)("button",{type:"button",className:"btn btn-outline-primary",onClick:this.confirmDelete,children:Object(j.tb)("Delete")})]}),this.state.isConfirmDialogOpen&&Object(p.jsx)(N.a,{children:Object(p.jsx)(De,{formActionURL:"".concat(j.vc,"profile/delete/"),csrfToken:Ne,toggle:this.toggleDialog})})]})}}]),a}(r.a.Component),Pe=(a(152),a(170),a(1731),window.app.pageOptions),Ae=Pe.canUpdatePassword,Te=Pe.passwordOperationText,Ee=Pe.enableGetAuthToken,Me=Pe.enableWebdavSecret,Re=Pe.enableAddressBook,Le=Pe.twoFactorAuthEnabled,Ue=Pe.enableWechatWork,Ve=Pe.enableDingtalk,Fe=Pe.enableDeleteAccount,We=function(e){Object(c.a)(a,e);var t=Object(i.a)(a);function a(e){var s;return Object(n.a)(this,a),(s=t.call(this,e)).updateUserInfo=function(e){u.a.updateUserInfo(e).then((function(e){s.setState({userInfo:e.data}),m.a.success(Object(j.tb)("Success"))})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))},s.onSearchedClick=function(e){if(!0===e.is_dir){var t=j.vc+"library/"+e.repo_id+"/"+e.repo_name+e.path;Object(d.c)(t,{repalce:!0})}else{var a=j.vc+"lib/"+e.repo_id+"/file"+h.a.encodePath(e.path);window.open("about:blank").location.href=a}},s.handleContentScroll=function(e){var t=e.target.scrollTop,a=s.sideNavItems.filter((function(e,a){return e.show&&document.getElementById(e.href.substr(1)).offsetTop-45<t}));a.length&&s.setState({curItemID:a[a.length-1].href.substr(1)})},s.sideNavItems=[{show:!0,href:"#user-basic-info",text:Object(j.tb)("Profile")},{show:Ae,href:"#update-user-passwd",text:Object(j.tb)("Password")},{show:Ee,href:"#get-auth-token",text:Object(j.tb)("Web API Auth Token")},{show:Me,href:"#update-webdav-passwd",text:Object(j.tb)("WebDav Password")},{show:Re,href:"#list-in-address-book",text:Object(j.tb)("Global Address Book")},{show:!0,href:"#lang-setting",text:Object(j.tb)("Language")},{show:j.Eb,href:"#email-notice",text:Object(j.tb)("Email Notification")},{show:Le,href:"#two-factor-auth",text:Object(j.tb)("Two-Factor Authentication")},{show:Ue,href:"#social-auth",text:Object(j.tb)("Social Login")},{show:Ve,href:"#social-auth",text:Object(j.tb)("Social Login")},{show:Fe,href:"#del-account",text:Object(j.tb)("Delete Account")}],s.state={curItemID:s.sideNavItems[0].href.substr(1)},s}return Object(s.a)(a,[{key:"componentDidMount",value:function(){var e=this;u.a.getUserInfo().then((function(t){e.setState({userInfo:t.data})})).catch((function(e){var t=h.a.getErrorMsg(e);m.a.danger(t)}))}},{key:"render",value:function(){return Object(p.jsx)(r.a.Fragment,{children:Object(p.jsxs)("div",{className:"h-100 d-flex flex-column",children:[Object(p.jsxs)("div",{className:"top-header d-flex justify-content-between",children:[Object(p.jsx)("a",{href:j.vc,children:Object(p.jsx)("img",{src:j.Rb+j.Mb,height:j.Lb,width:j.Nb,title:j.wc,alt:"logo"})}),Object(p.jsx)(O.a,{onSearchedClick:this.onSearchedClick})]}),Object(p.jsxs)("div",{className:"flex-auto d-flex o-hidden",children:[Object(p.jsx)("div",{className:"side-panel o-auto",children:Object(p.jsx)(g,{data:this.sideNavItems,curItemID:this.state.curItemID})}),Object(p.jsxs)("div",{className:"main-panel d-flex flex-column",children:[Object(p.jsx)("h2",{className:"heading",children:Object(j.tb)("Settings")}),Object(p.jsxs)("div",{className:"content position-relative",onScroll:this.handleContentScroll,children:[Object(p.jsxs)("div",{id:"user-basic-info",className:"setting-item",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Profile Setting")}),Object(p.jsx)(w,{}),this.state.userInfo&&Object(p.jsx)(D,{userInfo:this.state.userInfo,updateUserInfo:this.updateUserInfo})]}),Ae&&Object(p.jsxs)("div",{id:"update-user-passwd",className:"setting-item",children:[Object(p.jsx)("h3",{className:"setting-item-heading",children:Object(j.tb)("Password")}),Object(p.jsx)("a",{href:"".concat(j.vc,"accounts/password/change/"),className:"btn btn-outline-primary",children:Te})]}),Ee&&Object(p.jsx)(I,{}),Me&&Object(p.jsx)(Z,{}),Re&&this.state.userInfo&&Object(p.jsx)(se,{userInfo:this.state.userInfo,updateUserInfo:this.updateUserInfo}),Object(p.jsx)(ne,{}),j.Eb&&Object(p.jsx)(re,{}),Le&&Object(p.jsx)(he,{}),Ue&&Object(p.jsx)(fe,{}),Ve&&Object(p.jsx)(Ce,{}),Fe&&Object(p.jsx)(Ie,{})]})]})]})]})})}}]),a}(r.a.Component);b.a.render(Object(p.jsx)(We,{}),document.getElementById("wrapper"))}},[[1730,1,0]]]);
//# sourceMappingURL=settings.chunk.js.map