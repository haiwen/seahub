define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'jquery.fileupload-ui',
    'app/collections/dirents',
    'app/views/dirent',
    'text!' + app.config._tmplRoot + 'dir-op-bar.html',
    'text!' + app.config._tmplRoot + 'path-bar.html',
    ], function($, simplemodal, _, Backbone, Common, FileTree, FileUpload, DirentCollection, DirentView,
        DirOpBarTemplate, PathBarTemplate) {
        'use strict';

        var DirView = Backbone.View.extend({
            el: $('#dir-view'),
            path_bar_template: _.template(PathBarTemplate),
            dir_op_bar_template: _.template(DirOpBarTemplate),
            newDirTemplate: _.template($("#add-new-dir-form-template").html()),
            newFileTemplate: _.template($("#add-new-file-form-template").html()),
            //uploadFileDialogTemplate: _.template($("#upload-file-dialog-template").html()),

            initialize: function(options) {
                this.$dirent_list = this.$('.repo-file-list tbody');
                this.$path_bar = this.$('.path');
                // For compatible with css, we use .repo-op instead of .dir-op
                this.$dir_op_bar = this.$('.repo-op');

                this.dir = new DirentCollection();
                this.listenTo(this.dir, 'add', this.addOne);
                this.listenTo(this.dir, 'reset', this.reset);

                // initialize common js behavior
                $('th .checkbox-orig').unbind();

                // get 'more'
                var _this = this;
                $(window).scroll(function() {
                    if ($(_this.el).is(':visible')) {
                        _this.onWindowScroll();
                    }
                });

                // hide 'hidden-op' popup
                app.globalState.noFileOpPopup = true;
                $(document).click(function(e) {
                    var target =  e.target || event.srcElement;
                    var popup = $('.hidden-op');
                    if (!app.globalState.noFileOpPopup &&
                        !$('.more-op-icon, .hidden-op').is(target) &&
                        !popup.find('*').is(target)) {
                        popup.addClass('hide');
                        app.globalState.noFileOpPopup = true;
                        if (!app.globalState.popup_tr.find('*').is(target)) {
                            app.globalState.popup_tr.removeClass('hl').find('.repo-file-op').addClass('vh'); // clicked place: the first tr, place out of the table
                            $('.repo-file-list tr:gt(0)').each(function() { // when other tr is clicked
                                if ($(this).find('*').is(target)) {
                                    $(this).addClass('hl').find('.repo-file-op').removeClass('vh');
                                }
                            });
                        }
                    }
                });

                $(function() {
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

                    var dirents = _this.dir;
                    var libview = _this;
                    //var popup = $(libview.uploadFileDialogTemplate()).addClass('fixed-upload-file-dialog');
                    var popup = $('#upload-file-dialog').addClass('fixed-upload-file-dialog');
                    var popup_height = '200px';
                    popup.css({'height': popup_height}).data('height', popup_height);
                    var fu_status = $('.status', popup),
                        total_progress = $('.total-progress', popup),
                        cancel_all_btn = $('.fileupload-buttonbar .cancel', popup),
                        close_icon = $('.close', popup),
                        saving_tip = $('.saving-tip', popup);
                    var fu_status_ = {
                        'uploading': gettext("File Uploading..."),
                        'complete': gettext("File Upload complete"),
                        'canceled': gettext("File Upload canceled"),
                        'failed': gettext("File Upload failed")
                    };

                    var uploaded_files = [];

                    var enable_upload_folder = app.pageOptions.enable_upload_folder;
                    var new_dir_names = [];
                    var dirs_to_update = [];

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
                        if (!libview.$el.is(':visible')) {
                            return false;
                        }
                        if (dirents.user_perm && dirents.user_perm != 'rw') {
                            return false;
                        }
                        popup.removeClass('hide');
                        cancel_all_btn.removeClass('hide');
                        close_icon.addClass('hide');
                        var path = dirents.path;
                        popup.fileupload('option', 'formData', {
                            'parent_dir': path == '/' ? path : path + '/'
                        });

                        if (!enable_upload_folder) {
                            return;
                        }
                        // hide the upload menu
                        var menu = libview.$('#upload-menu');
                        if (!menu.hasClass('hide')) {
                            menu.find('.item').removeAttr('style')
                        .end().addClass('hide');
                        }

                        // when add folder, a subdirectory will be shown as '.'. rm it.
                        var file = data.files[0];
                        if (file.name == '.') {
                            data.files.shift();
                        }
                        if (file.webkitRelativePath) { // for 'upload folder'
                            file.relative_path = file.webkitRelativePath;
                        }
                        if (file.relativePath) { // for 'folder drag & drop'
                            file.relative_path = file.relativePath + file.name;
                        }
                    })
                    .bind('fileuploadstart', function() {
                        fu_status.html(fu_status_.uploading);
                    })
                    .bind('fileuploadsubmit', function(e, data) {
                        var file = data.files[0];
                        // get url(token) for every file
                        if (!file.error) {
                            $.ajax({
                                url: Common.getUrl({name:'get_file_op_url', repo_id:dirents.repo_id}) + '?op_type=upload',
                                cache: false,
                                dataType: 'json',
                                success: function(ret) {
                                    if (enable_upload_folder) {
                                        var file_path = file.relative_path,
                                            r_path;
                                        if (file_path) { // 'add folder'
                                            r_path = file_path.substring(0, file_path.lastIndexOf('/') + 1);
                                        }
                                        var formData = popup.fileupload('option', 'formData');
                                        formData.relative_path = r_path || '';
                                        popup.fileupload('option', 'formData', formData);
                                    }
                                    data.url = ret['url'];
                                    data.jqXHR = popup.fileupload('send', data);
                                },
                                error: function() {
                                    file.error = gettext("Failed to get upload url");
                                }
                            });
                            return false;
                        }
                    })
                    .bind('fileuploadprogressall', function (e, data) {
                        total_progress.html(parseInt(data.loaded / data.total * 100, 10) + '% ' + '<span style="font-size:14px;color:#555;">(' + $(this).data('blueimp-fileupload')._formatBitrate(data.bitrate) + ')</span>').removeClass('hide');
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
                            uploaded_files.push(file_uploaded);
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
                                    'obj_name': file.name,
                                    'last_modified': now,
                                    'file_size': Common.fileSizeFormat(file.size, 1),
                                    'obj_id': file.id,
                                    'file_icon': 'file.png',
                                    'last_update': gettext("Just now"),
                                    'starred': false,
                                    'sharelink': '',
                                    'sharetoken': ''
                                }, {silent: true});
                                libview.addNewFile(new_dirent);
                            });
                            uploaded_files = [];
                        }
                        if (new_dir_names.length > 0) {
                            $(new_dir_names).each(function(index, new_name) {
                                var new_dirent = dirents.add({
                                    'is_dir': true,
                                    'obj_name': new_name,
                                    'last_modified': now,
                                    'last_update': gettext("Just now"),
                                    'p_dpath': path + new_name,
                                    'sharelink': '',
                                    'sharetoken': '',
                                    'uploadlink': '',
                                    'uploadtoken': ''
                                }, {silent: true});
                                var view = new DirentView({model: new_dirent, dirView: libview});
                                libview.$dirent_list.prepend(view.render().el); // put the new dir as the first one
                            });
                            new_dir_names = [];
                        }
                        if (dirs_to_update.length > 0) {
                            $(dirs_to_update).each(function(index, dir_name) {
                                var dir = dirents.where({'is_dir':true, 'obj_name':dir_name});
                                dir[0].set({
                                    'last_modified': now,
                                    'last_update': gettext("Just now")
                                });
                            });
                            dirs_to_update = [];
                        }
                    })
                    // after tpl has rendered
                    .bind('fileuploadcompleted', function() { // 'done'
                        if ($('.files .cancel', popup).length == 0) {
                            saving_tip.hide();
                            total_progress.addClass('hide');
                            fu_status.html(fu_status_.complete);
                        }
                    })
                    .bind('fileuploadfailed', function(e, data) { // 'fail'
                        if ($('.files .cancel', popup).length == 0) {
                            cancel_all_btn.addClass('hide');
                            close_icon.removeClass('hide');
                            total_progress.addClass('hide');
                            saving_tip.hide();
                            if (data.errorThrown == 'abort') { // 'cancel'
                                fu_status.html(fu_status_.canceled);
                            } else { // 'error'
                                fu_status.html(fu_status_.failed);
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

                    // fold/unfold the dialog
                    $('.fold-switch', popup).click(function() {
                        var full_ht = parseInt(popup.data('height'));
                        var main_con = $('.fileupload-buttonbar, .table', popup);
                        if (popup.height() == full_ht) {
                            popup.height($('.hd', popup).outerHeight(true));
                            main_con.addClass('hide');
                        } else {
                            popup.height(full_ht);
                            main_con.removeClass('hide');
                        }
                    });
                    $('.close', popup).click(function() {
                        popup.addClass('hide');
                        $('.files', popup).empty();
                    });

                    $(document).click(function(e) {
                        var target = e.target || event.srcElement;
                        var closePopup = function(popup, popup_switch) {
                            if (!popup.hasClass('hide') && !popup.is(target) && !popup.find('*').is(target) && !popup_switch.is(target) && !popup_switch.find('*').is(target) ) {
                                popup.addClass('hide');
                            }
                        };
                        var libview = _this;
                        closePopup(libview.$('#upload-menu'), libview.$('#upload-file'));
                    });
                });

            },

            showDir: function(category, repo_id, path) {
                this.$el.show();
                var loading_tip = this.$('.loading-tip').show();
                var dir = this.dir;
                dir.setPath(category, repo_id, path);
                dir.fetch({
                    reset: true,
                    data: {'p': path},
                    success: function (collection, response, opts) {
                        dir.last_start = 0; // for 'more'
                        if (response.dirent_list.length == 0 ||  // the dir is empty
                            !response.dirent_more ) { // no 'more'
                            loading_tip.hide();
                        }
                    },
                    error: function () { // todo
                        loading_tip.hide();
                    }
                });
            },

            hide: function() {
                this.$el.hide();
            },

            addOne: function(dirent) {
                var view = new DirentView({model: dirent, dirView: this});
                this.$dirent_list.append(view.render().el);
            },

            reset: function() {
                this.$dirent_list.empty();
                this.dir.each(this.addOne, this);
                this.renderPath();
                this.renderDirOpBar();

                var dir = this.dir;
                var upload_popup = $('#upload-file-dialog');
                if (dir.user_perm && dir.user_perm == 'rw') {
                    upload_popup.fileupload(
                        'option',
                        'fileInput',
                        this.$('#upload-file input'));
                }
                if (!app.pageOptions.enable_upload_folder) {
                    return;
                }
                var upload_btn = this.$('#upload-file'),
                    upload_menu = this.$('#upload-menu');
                if (dir.user_perm && dir.user_perm == 'rw' &&
                    'webkitdirectory' in $('input[type="file"]', upload_btn)[0]) {
                        upload_btn.find('input').remove().end().addClass('cspt');
                        $('.item', upload_menu).click(function() {
                            upload_popup.fileupload(
                                    'option',
                                    'fileInput',
                                    $('input[type="file"]', $(this)));
                            })
                            .hover(
                                    function() {
                                        $(this).css({'background':'#f3f3f3'});
                                    },
                                    function() {
                                        $(this).css({'background':'transparent'});
                                    }
                                  );
                            this.$('.repo-op').css({'position': 'relative'});
                            upload_menu.css({
                                'left': upload_btn.position().left,
                                'top': parseInt(this.$('.repo-op').css('padding-top')) + upload_btn.outerHeight(true)
                            });
                            upload_btn.click(function () {
                                upload_menu.toggleClass('hide');
                            });
                        }
            },

            renderPath: function() {
                var dir = this.dir,
                    path = dir.path,
                    obj = {path: path, repo_name: dir.repo_name, category: dir.category};

                if (path != '/') {
                    $.extend(obj, {
                       path_list: path.substr(1).split('/'),
                       repo_id: dir.repo_id,
                    });
                }

                this.$path_bar.html(this.path_bar_template(obj));
            },

            renderDirOpBar: function() {
                var dir = this.dir,
                    user_perm = dir.user_perm;

                this.$dir_op_bar.html($.trim(this.dir_op_bar_template({
                    user_perm: user_perm,
                    encrypted: dir.encrypted,
                    path: dir.path,
                    repo_id: dir.repo_id,
                    enable_upload_folder: app.pageOptions.enable_upload_folder
                })));
            },

            // Directory Operations
            events: {
                'click .path-link': 'visitDir',
                'click #upload-file': 'uploadFile',
                'click #add-new-dir': 'newDir',
                'click #add-new-file': 'newFile',
                'click #share-cur-dir': 'share',
                'click th.select': 'select',
                'click #by-name': 'sortByName',
                'click #by-time': 'sortByTime',
                'click #del-dirents': 'delete',
                'click #mv-dirents': 'mv',
                'click #cp-dirents': 'cp'
            },

            newDir: function() {
                var form = $(this.newDirTemplate()),
                    form_id = form.attr('id'),
                    dir = this.dir,
                    dirView = this;

                form.modal({appendTo:'#main'});
                $('#simplemodal-container').css({'height':'auto'});

                form.submit(function() {
                    var dirent_name = $.trim($('input[name="name"]', form).val());

                    if (!dirent_name) {
                        Common.showFormError(form_id, gettext("It is required."));
                        return false;
                    };

                    var post_data = {'dirent_name': dirent_name},
                        post_url = Common.getUrl({name: "new_dir", repo_id: dir.repo_id})
                                   + '?parent_dir=' + encodeURIComponent(dir.path);
                    var after_op_success = function(data) {
                        $.modal.close();

                        var new_dirent = dir.add({
                            'is_dir': true,
                            'obj_name': data['name'],
                            'last_modified': new Date().getTime() / 1000,
                            'last_update': gettext("Just now"),
                            'p_dpath': data['p_dpath']
                        }, {silent:true});

                        var view = new DirentView({model: new_dirent, dirView: dirView});
                        dirView.$dirent_list.prepend(view.render().el); // put the new dir as the first one
                    };

                    Common.ajaxPost({
                        'form': form,
                        'post_url': post_url,
                        'post_data': post_data,
                        'after_op_success': after_op_success,
                        'form_id': form_id
                    });

                    return false;
                });
            },

            newFile: function() {
                var form = $(this.newFileTemplate()),
                    form_id = form.attr('id'),
                    file_name = form.find('input[name="name"]'),
                    dir = this.dir,
                    dirView = this;

                form.modal({
                    appendTo: '#main',
                    focus: false,
                    containerCss: {'padding':'20px 25px'}
                });
                $('#simplemodal-container').css({'height':'auto'});

                $('.set-file-type', form).click(function() {
                    file_name.val('.' + $(this).data('filetype'));
                    Common.setCaretPos(file_name[0], 0);
                    file_name.focus();
                });

                form.submit(function() {
                    var dirent_name = $.trim(file_name.val());

                    if (!dirent_name) {
                      Common.showFormError(form_id, gettext("It is required."));
                      return false;
                    };

                    // if it has an extension, make sure it has a name
                    if (dirent_name.lastIndexOf('.') != -1 && dirent_name.substr(0, dirent_name.lastIndexOf('.')).length == 0) {
                        Common.showFormError(form_id, gettext("Only an extension there, please input a name."));
                        return false;
                    }

                    var post_data = {'dirent_name': dirent_name},
                        post_url = Common.getUrl({name: "new_file", repo_id: dir.repo_id})
                                   + '?parent_dir=' + encodeURIComponent(dir.path);
                    var after_op_success = function(data) {
                        $.modal.close();
                        var new_dirent = dir.add({
                            'is_file': true,
                            'obj_name': data['name'],
                            'file_size': Common.fileSizeFormat(0),
                            'obj_id': '0000000000000000000000000000000000000000',
                            'file_icon': 'file.png',
                            'starred': false,
                            'last_modified': new Date().getTime() / 1000,
                            'last_update': gettext("Just now"),
                            'sharelink': '',
                            'sharetoken': ''
                        }, {silent: true});
                        dirView.addNewFile(new_dirent);
                    };

                    Common.ajaxPost({
                        'form': form,
                        'post_url': post_url,
                        'post_data': post_data,
                        'after_op_success': after_op_success,
                        'form_id': form_id
                    });

                    return false;
                });
            },

            addNewFile: function(new_dirent) {
                var dirView = this,
                    dir = this.dir;
                var view = new DirentView({model: new_dirent, dirView: dirView});
                var new_file = view.render().el;
                // put the new file as the first file
                if ($('tr', dirView.$dirent_list).length == 0) {
                    dirView.$dirent_list.append(new_file);
                } else {
                    var dirs = dir.where({'is_dir':true});
                    if (dirs.length == 0) {
                        dirView.$dirent_list.prepend(new_file);
                    } else {
                        // put the new file after the last dir
                        $($('tr', dirView.$dirent_list)[dirs.length - 1]).after(new_file);
                    }
                }
            },

            sortByName: function() {
                var dirents = this.dir;
                var el = $('#by-name');
                this.dir.comparator = function(a, b) {
                    if (a.get('is_dir') && b.get('is_file')) {
                        return -1;
                    }
                    if (el.hasClass('icon-caret-up')) {
                        return a.get('obj_name').toLowerCase() < b.get('obj_name').toLowerCase() ? 1 : -1;
                    } else {
                        return a.get('obj_name').toLowerCase() < b.get('obj_name').toLowerCase() ? -1 : 1;
                    }
                };
                dirents.sort();
                this.$dirent_list.empty();
                dirents.each(this.addOne, this);
                el.toggleClass('icon-caret-up icon-caret-down');
            },

            sortByTime: function () {
                var dirents = this.dir;
                var el = $('#by-time');
                dirents.comparator = function(a, b) {
                    if (a.get('is_dir') && b.get('is_file')) {
                        return -1;
                    }
                    if (el.hasClass('icon-caret-down')) {
                        return a.get('last_modified') < b.get('last_modified') ? 1 : -1;
                    } else {
                        return a.get('last_modified') < b.get('last_modified') ? -1 : 1;
                    }
                };
                dirents.sort();
                this.$dirent_list.empty();
                dirents.each(this.addOne, this);
                el.toggleClass('icon-caret-up icon-caret-down');
            },

            onWindowScroll: function () {
                var dir = this.dir;
                var start = dir.more_start;
                if (dir.dirent_more && $(window).scrollTop() + $(window).height() > $(document).height() - $('#footer').outerHeight(true) && start != dir.last_start) {
                    dir.last_start = start;
                    var loading_tip = this.$('.loading-tip');
                    dir.fetch({
                        remove: false,
                        data: {
                            'p': dir.path,
                            'start': dir.more_start
                        },
                        success: function (collection, response, opts) {
                            if (!response.dirent_more ) { // no 'more'
                                loading_tip.hide();
                            }
                        },
                        error: function(xhr, textStatus, errorThrown) {
                            loading_tip.hide();
                            Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                        }
                    });
                }
            }
      });

      return DirView;
});
