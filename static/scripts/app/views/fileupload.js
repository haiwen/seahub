define([
    'common',
    'backbone',
    'jquery.fileupload-ui'
], function(Common, Backbone, FileUpload) {

    window.locale = {
        "fileupload": {
            "errors": {
                "maxFileSize": gettext("File is too big"),
                "minFileSize": gettext("File is too small"),
                "acceptFileTypes": gettext("Filetype not allowed"),
                "maxNumberOfFiles": gettext("Max number of files exceeded"),
                "uploadedBytes": gettext("Uploaded bytes exceed file size"),
                "emptyResult": gettext("Empty file upload result")
            },
            "error": gettext("Error"),
            "uploaded": gettext("uploaded"),
            "canceled": gettext("canceled"),
            "start": gettext("Start"),
            "cancel": gettext("Cancel"),
            "destroy": gettext("Delete")
        }
    };

    var FileUploadView = Backbone.View.extend({
        el: $('#upload-file-dialog'),

        fileupdateConfirmTemplate: _.template($("#fileupdate-confirm-template").html()),

        initialize: function (options) {
            var dirView = this.dirView = options.dirView;
            var dirents = dirView.dir;

            var popup = this.$el.addClass('fixed-upload-file-dialog');

            this.popup_height = '200px';

            var $fu_status = $('.status', popup),
                $total_progress = $('.total-progress', popup),
                cancel_all_btn = $('.fileupload-buttonbar .cancel', popup),
                close_icon = $('.close', popup),
                saving_tip = $('.saving-tip', popup);

            var fu_status = {
                'uploading': gettext("File Uploading..."),
                'complete': gettext("File Upload complete"),
                'canceled': gettext("File Upload canceled"),
                'failed': gettext("File Upload failed")
            };

            var uploaded_files = [];
            var updated_files = [];

            var enable_upload_folder = app.pageOptions.enable_upload_folder;
            var enable_resumable_fileupload = app.pageOptions.enable_resumable_fileupload;

            var new_dir_names = [];
            var dirs_to_update = [];

            var _this = this;
            popup.fileupload({
                paramName: 'file',
                // customize it for 'done'
                getFilesFromResponse: function (data) {
                    if (data.result) {
                        return data.result;
                    }
                },
                autoUpload:true,
                maxNumberOfFiles: 500,
                sequentialUploads: true
            })
            .bind('fileuploadadd', function(e, data) {
                // for drag & drop
                if (!dirView.$el.is(':visible')) {
                    return false;
                }
                if (dirents.user_perm && dirents.user_perm != 'rw') {
                    return false;
                }
                popup.removeClass('hide');
                cancel_all_btn.removeClass('hide');
                close_icon.addClass('hide');

                var path = dirents.path;
                popup.fileupload('option', {
                    'formData': {
                        'parent_dir': path == '/' ? path : path + '/'
                    },
                    'maxChunkSize': undefined,
                    'uploadedBytes': undefined
                });

                if (!enable_upload_folder) {
                    return;
                }
                // hide the upload menu
                var menu = dirView.$('#upload-menu');
                if (!menu.hasClass('hide')) {
                    menu.addClass('hide');
                }

                var file = data.files[0];

                // add folder by clicking 'Upload Folder'
                if (file.name == '.') { // a subdirectory will be shown as '.'
                    data.files.shift();
                    return;
                }
                if (file.webkitRelativePath) {
                    file.relative_path = file.webkitRelativePath;
                }

                // add folder by drag & drop
                if (file.relativePath) {
                    file.relative_path = file.relativePath + file.name;
                }
            })
            .bind('fileuploadstart', function() {
                $fu_status.html(fu_status.uploading);
            })
            .bind('fileuploadsubmit', function(e, data) {
                if (data.files.length == 0) {
                    return false;
                }
                var file = data.files[0];
                if (file.error) {
                    return false;
                }

                var upload_file = function() {
                    $.ajax({
                        url: Common.getUrl({
                            name: 'get_file_op_url',
                            repo_id: dirents.repo_id
                            }),
                        data: {
                            'op_type': 'upload',
                            'path': dirents.path
                        },
                        cache: false,
                        dataType: 'json',
                        success: function(ret) {
                            if (enable_upload_folder && file.relative_path) { // 'add folder'
                                var file_path = file.relative_path,
                                    r_path = file_path.substring(0, file_path.lastIndexOf('/') + 1),
                                    formData = popup.fileupload('option', 'formData');
                                formData.relative_path = r_path;
                                popup.fileupload('option', {
                                    'formData': formData
                                });
                                data.url = ret['url'];
                                data.jqXHR = popup.fileupload('send', data);

                            } else {
                                var block_size = 1024 * 1024;
                                if (enable_resumable_fileupload &&
                                        file.size && file.size > block_size) {
                                    popup.fileupload('option', 'maxChunkSize', block_size);
                                    $.ajax({
                                        url: Common.getUrl({
                                            name: 'get_file_uploaded_bytes',
                                            repo_id: dirents.repo_id
                                        }),
                                        data: {
                                            'parent_dir': dirents.path,
                                            'file_name': file.name
                                        },
                                        cache: false,
                                        dataType: 'json',
                                        success: function(file_uploaded_data) {
                                            popup.fileupload('option', 'uploadedBytes', file_uploaded_data.uploadedBytes);
                                            data.url = ret['url'];
                                            data.jqXHR = popup.fileupload('send', data);
                                        }
                                    });

                                } else {
                                    data.url = ret['url'];
                                    data.jqXHR = popup.fileupload('send', data);
                                }
                            }
                        },
                        error: function() {
                            file.error = gettext("Failed to get upload url");
                        }
                    });
                };

                if (file.relative_path || data.originalFiles.length > 1) { // 'add folder' or upload more than 1 file once
                    upload_file();
                    return false;
                }

                var update_file = function() {
                    $.ajax({
                        url: Common.getUrl({
                            name: 'get_file_op_url',
                            repo_id: dirents.repo_id
                            }),
                        data: {
                            'op_type': 'update',
                            'path': dirents.path
                        },
                        cache: false,
                        dataType: 'json',
                        success: function(ret) {
                            var formData = popup.fileupload('option', 'formData');
                            formData.target_file = formData.parent_dir + file.name;
                            popup.fileupload('option', 'formData', formData);

                            file.to_update = true;

                            data.url = ret['url'];
                            data.jqXHR = popup.fileupload('send', data);
                        },
                        error: function() {
                            file.error = gettext("Failed to get update url");
                        }
                    });
                };

                var files = dirents.where({'is_file': true}),
                    file_names = [];
                $(files).each(function() {
                    file_names.push(this.get('obj_name'));
                });
                if (file_names.indexOf(file.name) != -1) { // file with the same name already exists in the dir
                    var confirm_title = gettext("Replace file {filename}?")
                        .replace('{filename}', '<span class="op-target">' + Common.HTMLescape(file.name) + '</span>');
                    var confirm_popup = $(_this.fileupdateConfirmTemplate({
                        title: confirm_title
                    }));
                    confirm_popup.modal({
                        onClose: function() {
                            $.modal.close();
                            if (file.choose_to_update) {
                                update_file();
                            } else if (file.choose_to_upload) {
                                upload_file();
                            } else {
                                data.jqXHR = popup.fileupload('send', data);
                                data.jqXHR.abort();
                            }
                        }
                    });
                    $('#simplemodal-container').css({'height':'auto'});
                    $('.yes', confirm_popup).click(function() {
                        var selected_file = dirents.findWhere({'obj_name': file.name});
                        if (selected_file.get('is_locked')) {
                            if (selected_file.get('locked_by_me')) {
                                file.choose_to_update = true;
                                $.modal.close();
                            } else {
                                $('.error', confirm_popup).html(gettext("File is locked")).removeClass('hide');
                                Common.disableButton($(this));
                            }
                        } else {
                            file.choose_to_update = true;
                            $.modal.close();
                        }
                    });
                    $('.no', confirm_popup).click(function() {
                        file.choose_to_upload = true;
                        $.modal.close();
                    });
                } else {
                    upload_file();
                }
                return false;
            })
            .bind('fileuploadprogressall', function (e, data) {
                $total_progress.html(parseInt(data.loaded / data.total * 100, 10) + '% ' +
                    '<span style="font-size:14px;color:#555;">(' +
                    $(this).data('blueimp-fileupload')._formatBitrate(data.bitrate) +
                    ')</span>').removeClass('hide');
                if (data.loaded > 0 && data.loaded == data.total) {
                    saving_tip.show();
                }
            })
            .bind('fileuploaddone', function(e, data) {
                if (data.textStatus != 'success') {
                    return;
                }
                var file = data.files[0];
                var file_path = file.relative_path;
                var file_uploaded = data.result[0]; // 'id', 'name', 'size'
                // for 'template_download' render
                file_uploaded.uploaded = true;
                if (file_path) {
                    file_uploaded.relative_path = file_path.substring(0, file_path.lastIndexOf('/') + 1) + file_uploaded.name;
                }
                var path = dirents.path;
                path = path == '/' ? path : path + '/';
                if (data.formData.parent_dir != path) {
                    return;
                }
                if (!file_path) {
                    if (!file.to_update) {
                        uploaded_files.push(file_uploaded);
                    } else {
                        updated_files.push(file_uploaded);
                    }
                    return;
                }
                if (!enable_upload_folder) {
                    return;
                }
                // for 'add folder'
                var dir_name = file_path.substring(0, file_path.indexOf('/'));
                var dir = dirents.where({'is_dir': true, 'obj_name': dir_name});
                if (dir.length > 0) { // 0 or 1
                    if (dirs_to_update.indexOf(dir_name) == -1) {
                        dirs_to_update.push(dir_name);
                    }
                } else {
                    if (new_dir_names.indexOf(dir_name) == -1) {
                        new_dir_names.push(dir_name);
                    }
                }
            })
            .bind('fileuploadstop', function () {
                cancel_all_btn.addClass('hide');
                close_icon.removeClass('hide');
                var path = dirents.path;
                path = path == '/' ? path : path + '/';
                if (popup.fileupload('option','formData').parent_dir != path) {
                    return;
                }
                var now = parseInt(new Date().getTime()/1000);
                if (uploaded_files.length > 0) {
                    $(uploaded_files).each(function(index, file) {
                        var new_dirent = dirents.add({
                            'is_file': true,
                            'is_img': Common.imageCheck(file.name),
                            'obj_name': file.name,
                            'last_modified': now,
                            'file_size': Common.fileSizeFormat(file.size, 1),
                            'obj_id': file.id,
                            'file_icon': 'file.png',
                            'perm': 'rw',
                            'last_update': gettext("Just now"),
                            'starred': false
                        }, {silent: true});
                        dirView.addNewFile(new_dirent);
                    });
                    uploaded_files = [];
                }
                if (new_dir_names.length > 0) {
                    $(new_dir_names).each(function(index, new_name) {
                        var new_dirent = dirents.add({
                            'is_dir': true,
                            'obj_name': new_name,
                            'perm': 'rw',
                            'last_modified': now,
                            'last_update': gettext("Just now"),
                            'p_dpath': path + new_name
                        }, {silent: true});
                        dirView.addNewDir(new_dirent);
                    });
                    new_dir_names = [];
                }
                if (dirs_to_update.length > 0) {
                    $(dirs_to_update).each(function(index, dir_name) {
                        var dir_to_update = dirents.where({'is_dir':true, 'obj_name':dir_name});
                        dir_to_update[0].set({
                            'last_modified': now,
                            'last_update': gettext("Just now")
                        });
                    });
                    dirs_to_update = [];
                }
                if (updated_files.length > 0) {
                    $(updated_files).each(function(index, item) {
                        var file_to_update = dirents.where({'is_file':true, 'obj_name':item.name});
                        file_to_update[0].set({
                            'obj_id': item.id,
                            'file_size': Common.fileSizeFormat(item.size, 1),
                            'last_modified': now,
                            'last_update': gettext("Just now")
                        });
                    });
                    updated_files = [];
                }
            })
            // after tpl has rendered
            .bind('fileuploadcompleted', function() { // 'done'
                if ($('.files .cancel', popup).length == 0) {
                    saving_tip.hide();
                    $total_progress.addClass('hide');
                    $fu_status.html(fu_status.complete);
                }
            })
            .bind('fileuploadfailed', function(e, data) { // 'fail'
                if ($('.files .cancel', popup).length == 0) {
                    cancel_all_btn.addClass('hide');
                    close_icon.removeClass('hide');
                    $total_progress.addClass('hide');
                    saving_tip.hide();
                    if (data.errorThrown == 'abort') { // 'cancel'
                        $fu_status.html(fu_status.canceled);
                    } else { // 'error'
                        $fu_status.html(fu_status.failed);
                    }
                }
            });

            var max_upload_file_size = app.pageOptions.max_upload_file_size;
            if (max_upload_file_size) {
                popup.fileupload(
                    'option',
                    'maxFileSize',
                    max_upload_file_size);
            }

            // Enable iframe cross-domain access via redirect option:
            popup.fileupload(
                'option',
                'redirect',
                window.location.href.replace(/\/repo\/[-a-z0-9]{36}\/.*/, app.config.mediaUrl + 'cors/result.html?%s')
            );

        },

        events: {
            'click .fold-switch': 'foldAndUnfoldPopup',
            'click .close': 'closePopup'
        },

        foldAndUnfoldPopup : function () {
            var popup = this.$el;
            var full_ht = parseInt(this.popup_height);
            var main_con = $('.fileupload-buttonbar, .table', popup);
            if (popup.height() == full_ht) {
                popup.height($('.hd', popup).outerHeight(true));
                main_con.addClass('hide');
            } else {
                popup.height(full_ht);
                main_con.removeClass('hide');
            }
        },

        closePopup: function () {
            var popup = this.$el;
            popup.addClass('hide');
            $('.files', popup).empty();
        }
    });

    return FileUploadView;
});
