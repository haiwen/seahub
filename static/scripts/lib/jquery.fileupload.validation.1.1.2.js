/*
 * jQuery File Upload Validation Plugin 1.1.2
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* global define, window */
(function(factory){if(typeof define==="function"&&define.amd){define(["jquery","jquery.fileupload-process"],factory);}else{factory(window.jQuery);}}(function($){$.blueimp.fileupload.prototype.options.processQueue.push({action:"validate",always:true,acceptFileTypes:"@",maxFileSize:"@",minFileSize:"@",maxNumberOfFiles:"@",disabled:"@disableValidation"});$.widget("blueimp.fileupload",$.blueimp.fileupload,{options:{getNumberOfFiles:$.noop,messages:{maxNumberOfFiles:"Maximum number of files exceeded",acceptFileTypes:"File type not allowed",maxFileSize:"File is too large",minFileSize:"File is too small"}},processActions:{validate:function(data,options){if(options.disabled){return data;}var dfd=$.Deferred(),settings=this.options,file=data.files[data.index],fileSize;if(options.minFileSize||options.maxFileSize){fileSize=file.size;}if($.type(options.maxNumberOfFiles)==="number"&&(settings.getNumberOfFiles()||0)+data.files.length>options.maxNumberOfFiles){file.error=settings.i18n("maxNumberOfFiles");}else{if(options.acceptFileTypes&&!(options.acceptFileTypes.test(file.type)||options.acceptFileTypes.test(file.name))){file.error=settings.i18n("acceptFileTypes");}else{if(fileSize>options.maxFileSize){file.error=settings.i18n("maxFileSize");}else{if($.type(fileSize)==="number"&&fileSize<options.minFileSize){file.error=settings.i18n("minFileSize");}else{delete file.error;}}}}if(file.error||data.files.error){data.files.error=true;dfd.rejectWith(this,[data]);}else{dfd.resolveWith(this,[data]);}return dfd.promise();}}});}));
