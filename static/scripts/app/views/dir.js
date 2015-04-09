define([
    'jquery',
    'jquery.ui.progressbar',
    'jquery.magnific-popup',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/collections/dirents',
    'app/views/dirent',
    'app/views/fileupload',
    'app/views/share'
    ], function($, progressbar, magnificPopup, simplemodal, _, Backbone, Common, FileTree, DirentCollection, DirentView,
        FileUploadView, ShareView) {
        'use strict';

        var DirView = Backbone.View.extend({
            el: $('#dir-view'),

            path_bar_template: _.template($('#path-bar-tmpl').html()),
            dir_op_bar_template: _.template($('#dir-op-bar-tmpl').html()),
            newDirTemplate: _.template($("#add-new-dir-form-template").html()),
            newFileTemplate: _.template($("#add-new-file-form-template").html()),
            mvcpTemplate: _.template($("#mvcp-form-template").html()),
            mvProgressTemplate: _.template($("#mv-progress-popup-template").html()),

            initialize: function(options) {
                this.$dirent_list = this.$('.repo-file-list tbody');
                this.$path_bar = this.$('.path');
                // For compatible with css, we use .repo-op instead of .dir-op
                this.$dir_op_bar = this.$('.repo-op');

                this.dir = new DirentCollection();
                this.listenTo(this.dir, 'add', this.addOne);
                this.listenTo(this.dir, 'reset', this.reset);

                this.fileUploadView = new FileUploadView({dirView: this});

                this.$el.magnificPopup({
                    type: 'image',
                    delegate: '.img-name-link',
                    tClose: gettext("Close (Esc)"), // Alt text on close button
                    tLoading: gettext("Loading..."), // Text that is displayed during loading. Can contain %curr% and %total% keys
                    gallery: {
                        enabled: true,
                        tPrev: gettext("Previous (Left arrow key)"), // Alt text on left arrow
                        tNext: gettext("Next (Right arrow key)"), // Alt text on right arrow
                        tCounter: gettext("%curr% of %total%") // Markup for "1 of 7" counter
                    },
                    image: {
                        titleSrc: function(item) {
                            var el = item.el;
                            var img_name = el[0].innerHTML;
                            var img_link = '<a href="' + el.attr('href') + '" target="_blank">' + gettext("Open in New Tab") + '</a>';
                            return img_name + '<br />' + img_link;
                        },
                        tError: gettext('<a href="%url%" target="_blank">The image</a> could not be loaded.') // Error message when image could not be loaded
                    }
                });

                // initialize common js behavior
                this.$('th .checkbox-orig').unbind();

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

                // get contacts for 'share'
                Common.ajaxGet({
                    'get_url': Common.getUrl({name: 'get_user_contacts'}),
                    'after_op_success': function (data) {
                        app.pageOptions.contacts = data["contacts"];
                    }
                });
            },

            showDir: function(category, repo_id, path) {
                this.$el.show();
                this.$dirent_list.empty();
                var loading_tip = this.$('.loading-tip').show();
                var dir = this.dir;
                dir.setPath(category, repo_id, path);
                var _this = this;
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
                    error: function (collection, response, opts) {
                        loading_tip.hide();
                        var $el_con = _this.$('.repo-file-list-topbar, .repo-file-list').hide();
                        var $error = _this.$('.error');
                        var err_msg;
                        var decrypt_lib = false;
                        if (response.responseText) {
                            if (response.responseJSON.lib_need_decrypt) {
                                decrypt_lib = true;
                            } else {
                                err_msg = response.responseJSON.error;
                            }
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        if (err_msg) {
                            $error.html(err_msg).show();
                        }

                        if (decrypt_lib) {
                            var form = $($('#repo-decrypt-form-template').html());
                            form.modal({containerCss: {'padding': '1px'}});
                            $('#simplemodal-container').css({'height':'auto'});
                            form.submit(function() {
                                var passwd = $.trim($('[name="password"]', form).val());
                                if (!passwd) {
                                    $('.error', form).html(gettext("Password is required.")).removeClass('hide');
                                    return false;
                                }
                                Common.ajaxPost({
                                    form: form,
                                    form_id: form.attr('id'),
                                    post_url: Common.getUrl({'name':'repo_set_password'}),
                                    post_data: {
                                        repo_id: repo_id,
                                        password: passwd,
                                        username: app.pageOptions.username
                                    },
                                    after_op_success: function() {
                                        $.modal.close();
                                        $el_con.show();
                                        _this.showDir(category, repo_id, path);
                                    }
                                });
                                return false;
                            });
                        }
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
                this.dir.each(this.addOne, this);
                this.renderPath();
                this.renderDirOpBar();
                this.fileUploadView.setFileInput();
                this.renderThumbnail();
            },

            renderThumbnail: function() {
                var img_icons = $('.not-thumbnail'),
                    repo_id = this.dir.repo_id,
                    cur_path = this.dir.path,
                    _this = this,
                    file_path;

                if (img_icons.length === 0) {
                    return;
                }

                var get_thumbnail = function(i) {

                    var img_icon = $(img_icons[i]),
                        file_name = img_icon.attr('data-name');

                    if (cur_path === '/') {
                        file_path = cur_path + file_name;
                    } else {
                        file_path = cur_path + '/' + file_name;
                    }

                    $.ajax({
                        url: Common.getUrl({name: 'thumbnail_create', repo_id: repo_id}),
                        data: {'path': file_path},
                        cache: false,
                        dataType: 'json',
                        success: function(data) {
                            img_icon.attr("src", data.thumbnail_src).load(function() {
                                $(this).removeClass("not-thumbnail").addClass("thumbnail");
                            });
                        },
                        complete: function() {
                            // cur_path may be changed. e.g., the user enter another directory
                            if (i < img_icons.length - 1 && _this.dir.path === cur_path) {
                                get_thumbnail(++i);
                            } else {
                                return;
                            }
                        }
                    });
                };
                get_thumbnail(0);
            },

            renderPath: function() {
                var dir = this.dir,
                    path = dir.path,
                    obj = {
                        path: path,
                        repo_name: dir.repo_name,
                        category: dir.category
                    };

                var path_list = path.substr(1).split('/');
                var path_list_encoded = path_list.map(function(e) { return encodeURIComponent(e); });
                if (path != '/') {
                    $.extend(obj, {
                       path_list: path_list,
                       path_list_encoded: path_list_encoded,
                       repo_id: dir.repo_id
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
                    site_root: app.pageOptions.site_root,
                    is_repo_owner: dir.is_repo_owner,
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
                'click #mv-dirents': 'mv',
                'click #cp-dirents': 'cp',
                'click #del-dirents': 'del',
                'click #by-name': 'sortByName',
                'click #by-time': 'sortByTime',
                'mouseenter .thumbnail': 'showPreview'
            },

            showPreview: function(e) {
                var thumbnail = $(e.target),
                    file_name = thumbnail.attr('data-name'),
                    preview_wrap = $("#preview-wrap"),
                    caret = $("#image-preview").next(),
                    cur_path = this.dir.path,
                    repo_id = this.dir.repo_id,
                    default_size = parseInt(app.pageOptions.previewDefaultSize),
                    ajaxRequest = {},
                    file_path;

                preview_wrap.css({'width': default_size + 'px', 'height': default_size + 'px'})

                if (cur_path === '/') {
                    file_path = cur_path + file_name;
                } else {
                    file_path = cur_path + '/' + file_name;
                }

                var timer = setTimeout(function () {
                        ajaxRequest = $.ajax({
                            url: Common.getUrl({name: 'thumbnail_create', repo_id: repo_id}),
                            data: {'path': file_path, 'size': default_size},
                            cache: false,
                            dataType: 'json',
                            success: function(data) {
                                $('#image-preview').attr("src", data.thumbnail_src);

                                var wrap_width = preview_wrap.outerWidth(),
                                    wrap_padding = parseInt(preview_wrap.css('padding-top')),
                                    caret_width = parseInt(caret.css('border-top-width'));

                                caret.removeClass('bottom-outer-caret')
                                     .addClass('right-outer-caret')
                                     .css({
                                           'top':(default_size)/2 + wrap_padding - caret_width + 'px',
                                           'left':default_size + 2 * wrap_padding + 'px'
                                         });

                                preview_wrap.css({
                                    'top'  : (thumbnail.offset().top + (thumbnail.height() - wrap_width)/2) + 'px',
                                    'left' : thumbnail.closest('tr').offset().left - wrap_width - caret_width + 'px'
                                }).fadeIn();
                            }
                        });
                    }, 200);

                $('.dirent-icon').on('mouseleave', function() {
                    if (ajaxRequest.hasOwnProperty('abort')) {
                        ajaxRequest.abort();
                    }
                    clearTimeout(timer);
                    preview_wrap.hide();
                    $("#image-preview").attr('src', ''); // for ff. In ff, when hover, the last preview image would be shown first, then the right one.
                });
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
                        dirView.addNewDir(new_dirent);
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
                            'is_img': Common.imageCheck(data['name']),
                            'obj_name': data['name'],
                            'file_size': Common.fileSizeFormat(0),
                            'obj_id': '0000000000000000000000000000000000000000',
                            'file_icon': 'file.png',
                            'starred': false,
                            'last_modified': new Date().getTime() / 1000,
                            'last_update': gettext("Just now")
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

            addNewDir: function(new_dirent) {
                var dirView = this;
                var view = new DirentView({model: new_dirent, dirView: dirView});
                dirView.$dirent_list.prepend(view.render().el); // put the new dir as the first one
            },

            share: function () {
                var dir = this.dir;
                var path = dir.path;
                var options = {
                    'is_repo_owner': dir.is_repo_owner,
                    'is_virtual': dir.is_virtual,
                    'user_perm': dir.user_perm,
                    'repo_id': dir.repo_id,
                    'is_dir': true,
                    'dirent_path': path,
                    'obj_name': path == '/' ? dir.repo_name : path.substr(path.lastIndexOf('/') + 1)
                };
                new ShareView(options);
            },

            sortByName: function() {
                var dirents = this.dir;
                var el = $('#by-name');
                dirents.comparator = function(a, b) {
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

            select: function () {
                var el = this.$('th .checkbox');
                el.toggleClass('checkbox-checked');

                var dir = this.dir;
                var all_dirent_checkbox = this.$('.checkbox');
                var $dirents_op = this.$('#multi-dirents-op');

                if (el.hasClass('checkbox-checked')) {
                    all_dirent_checkbox.addClass('checkbox-checked');
                    dir.each(function(model) {
                        model.set({'selected': true}, {silent: true});
                    });
                    $dirents_op.css({'display':'inline'});
                } else {
                    all_dirent_checkbox.removeClass('checkbox-checked');
                    dir.each(function(model) {
                        model.set({'selected': false}, {silent: true});
                    });
                    $dirents_op.hide();
                }
            },

            del: function () {
                var dirents = this.dir;
                var _this = this;

                var del_dirents = function() {
                    $('#confirm-popup').append('<p style="color:red;">' + gettext("Processing...") + '</p>');
                    var selected_dirents = dirents.where({'selected':true}),
                        selected_names = [];
                    $(selected_dirents).each(function() {
                        selected_names.push(this.get('obj_name'));
                    });
                    $.ajax({
                        url: Common.getUrl({
                            name: 'del_dirents',
                            repo_id: dirents.repo_id
                        }) + '?parent_dir=' + encodeURIComponent(dirents.path),
                        type: 'POST',
                        dataType: 'json',
                        beforeSend: Common.prepareCSRFToken,
                        traditional: true,
                        data: {
                            'dirents_names': selected_names
                        },
                        success: function(data) {
                            var del_len = data['deleted'].length,
                                not_del_len = data['undeleted'].length,
                                msg_s, msg_f;

                            if (del_len > 0) {
                                if (del_len == selected_names.length) {
                                    dirents.remove(selected_dirents);
                                    _this.$('th .checkbox').removeClass('checkbox-checked');
                                    _this.$('#multi-dirents-op').hide();
                                } else {
                                    $(selected_dirents).each(function() {
                                        if (this.get('obj_name') in data['deleted']) {
                                            dirents.remove(this);
                                        }
                                    });
                                }
                                if (del_len == 1) {
                                    msg_s = gettext("Successfully deleted %(name)s.");
                                } else if (del_len == 2) {
                                    msg_s = gettext("Successfully deleted %(name)s and 1 other item.");
                                } else {
                                    msg_s = gettext("Successfully deleted %(name)s and %(amount)s other items.");
                                }
                                msg_s = msg_s.replace('%(name)s', Common.HTMLescape(data['deleted'][0])).replace('%(amount)s', del_len - 1);
                                Common.feedback(msg_s, 'success');
                            }
                            if (not_del_len > 0) {
                                if (not_del_len == 1) {
                                    msg_f = gettext("Internal error. Failed to delete %(name)s.");
                                } else if (not_del_len == 2) {
                                    msg_f = gettext("Internal error. Failed to delete %(name)s and 1 other item.");
                                } else {
                                    msg_f = gettext("Internal error. Failed to delete %(name)s and %(amount)s other items.");
                                }
                                msg_f = msg_f.replace('%(name)s', Common.HTMLescape(data['undeleted'][0])).replace('%(amount)s', not_del_len - 1);
                                Common.feedback(msg_f, 'error');
                            }
                            $.modal.close();
                        },
                        error: function(xhr, textStatus, errorThrown) {
                            $.modal.close();
                            Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                        }
                    });
                };
                Common.showConfirm(gettext("Delete Items"),
                    gettext("Are you sure you want to delete these selected items?"),
                    del_dirents);
            },

            mv: function () {
                this.mvcp({'op':'mv'});
            },
            cp: function () {
                this.mvcp({'op':'cp'});
            },
            mvcp: function (params) {
                var dir = this.dir;
                var op = params.op;

                var title = op == 'mv' ? "Move selected item(s) to:" : "Copy selected item(s) to:";

                var form = $(this.mvcpTemplate({
                    form_title: title,
                    op_type: op,
                    obj_type: '',
                    obj_name: '',
                    show_other_repos: !dir.encrypted,
                }));
                form.modal({appendTo:'#main', autoResize:true, focus:false});
                $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

                FileTree.renderTreeForPath({
                    repo_name: dir.repo_name,
                    repo_id: dir.repo_id,
                    path: dir.path
                });
                if (!dir.encrypted) {
                    FileTree.prepareOtherReposTree({cur_repo_id: dir.repo_id});
                }

                var _this = this;
                var dirents = this.dir;
                // get models
                var dirs = dirents.where({'is_dir':true, 'selected':true}),
                    files = dirents.where({'is_file':true, 'selected':true});
                var dir_names = [], file_names = [];
                $(dirs).each(function() {
                    dir_names.push(this.get('obj_name'));
                });
                $(files).each(function() {
                    file_names.push(this.get('obj_name'));
                });
                form.submit(function() {
                    var dst_repo = $('[name="dst_repo"]', form).val(),
                        dst_path = $('[name="dst_path"]', form).val(),
                        url_main;
                    var cur_path = dirents.path;
                    var url_obj = {repo_id:dirents.repo_id};

                    if (!$.trim(dst_repo) || !$.trim(dst_path)) {
                        $('.error', form).removeClass('hide');
                        return false;
                    }
                    if (dst_repo == dirents.repo_id && dst_path == cur_path) {
                        $('.error', form).html(gettext("Invalid destination path")).removeClass('hide');
                        return false;
                    }

                    Common.disableButton($('[type="submit"]', form));
                    form.append('<p style="color:red;">' + gettext("Processing...") + '</p>');

                    if (dst_repo == dirents.repo_id) {
                        // when mv/cp in current lib, files/dirs can be handled in batch, and no need to show progress
                        url_obj.name = op == 'mv' ? 'mv_dirents' : 'cp_dirents';
                        $.ajax({
                            url: Common.getUrl(url_obj) + '?parent_dir=' + encodeURIComponent(cur_path),
                            type: 'POST',
                            dataType: 'json',
                            beforeSend: Common.prepareCSRFToken,
                            traditional: true,
                            data: {
                                'file_names': file_names,
                                'dir_names': dir_names,
                                'dst_repo': dst_repo,
                                'dst_path': dst_path
                            },
                            success: function(data) {
                                var success_len = data['success'].length,
                                    msg_s, msg_f,
                                    view_url = data['url'];

                                $.modal.close();
                                if (success_len > 0) {
                                    if (op == 'mv') {
                                        if (success_len == files.length + dirs.length) {
                                            dirents.remove(dirs);
                                            dirents.remove(files);
                                            _this.$('th .checkbox').removeClass('checkbox-checked');
                                            _this.$('#multi-dirents-op').hide();
                                        } else {
                                            $(dirs).each(function() {
                                                if (this.get('obj_name') in data['success']) {
                                                    dirents.remove(this);
                                                }
                                            });
                                            $(files).each(function() {
                                                if (this.get('obj_name') in data['success']) {
                                                    dirents.remove(this);
                                                }
                                            });
                                        }
                                        if (success_len == 1) {
                                            msg_s = gettext("Successfully moved %(name)s.");
                                        } else if (success_len == 2) {
                                            msg_s = gettext("Successfully moved %(name)s and 1 other item.");
                                        } else {
                                            msg_s = gettext("Successfully moved %(name)s and %(amount)s other items.");
                                        }
                                    } else { // cp
                                        if (success_len == 1) {
                                            msg_s = gettext("Successfully copied %(name)s.");
                                        } else if (success_len == 2) {
                                            msg_s = gettext("Successfully copied %(name)s and 1 other item.");
                                        } else {
                                            msg_s = gettext("Successfully copied %(name)s and %(amount)s other items.");
                                        }
                                    }

                                    msg_s = msg_s.replace('%(name)s', Common.HTMLescape(data['success'][0])).replace('%(amount)s', success_len - 1);
                                    //msg_s += ' <a href="' + view_url + '">' + "View" + '</a>';
                                    Common.feedback(msg_s, 'success');
                                }

                                if (data['failed'].length > 0) {
                                    if (op == 'mv') {
                                        if (data['failed'].length > 1) {
                                            msg_f = gettext("Internal error. Failed to move %(name)s and %(amount)s other item(s).");
                                        } else {
                                            msg_f = gettext("Internal error. Failed to move %(name)s.");
                                        }
                                    } else {
                                        if (data['failed'].length > 1) {
                                            msg_f = gettext("Internal error. Failed to copy %(name)s and %(amount)s other item(s).");
                                        } else {
                                            msg_f = gettext("Internal error. Failed to copy %(name)s.");
                                        }
                                    }
                                    msg_f = msg_f.replace('%(name)s', Common.HTMLescape(data['failed'][0])).replace('%(amount)s', data['failed'].length - 1);
                                    Common.feedback(msg_f, 'error');
                                }
                            },
                            error: function(xhr, textStatus, errorThrown) {
                                $.modal.close();
                                Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                            }
                        });
                    } else {
                        // when mv/cp to another lib, files/dirs should be handled one by one, and need to show progress
                        var op_objs = dirents.where({'selected':true}),
                            i = 0;
                        // progress popup
                        var mv_progress_popup = $(_this.mvProgressTemplate());
                        var details = $('#mv-details', mv_progress_popup),
                            cancel_btn = $('#cancel-mv', mv_progress_popup),
                            other_info = $('#mv-other-info', mv_progress_popup);

                        var mvcpDirent = function () {
                            var op_obj = op_objs[i],
                                obj_type = op_obj.get('is_dir') ? 'dir':'file',
                                obj_name = op_obj.get('obj_name'),
                                post_url,
                                post_data;

                            if (op == 'mv') {
                                url_obj.name = obj_type == 'dir' ? 'mv_dir' : 'mv_file';
                            } else {
                                url_obj.name = obj_type == 'dir' ? 'cp_dir' : 'cp_file';
                            }
                            post_url = Common.getUrl(url_obj) + '?path=' + encodeURIComponent(cur_path) + '&obj_name=' + encodeURIComponent(obj_name);
                            post_data = {
                                'dst_repo': dst_repo,
                                'dst_path': dst_path
                            };
                            var after_op_success = function (data) {
                                var det_text = op == 'mv' ? gettext("Moving file %(index)s of %(total)s") : gettext("Copying file %(index)s of %(total)s");
                                details.html(det_text.replace('%(index)s', i + 1).replace('%(total)s', op_objs.length)).removeClass('vh');
                                cancel_btn.removeClass('hide');
                                var req_progress = function () {
                                    var task_id = data['task_id'];
                                    cancel_btn.data('task_id', task_id);
                                    $.ajax({
                                        url: Common.getUrl({name:'get_cp_progress'}) + '?task_id=' + encodeURIComponent(task_id),
                                        dataType: 'json',
                                        success: function(data) {
                                            var bar = $('.ui-progressbar-value', $('#mv-progress'));
                                            if (!data['failed'] && !data['canceled'] && !data['successful']) {
                                                setTimeout(req_progress, 1000);
                                            } else {
                                                if (data['successful']) {
                                                    bar.css('width', parseInt((i + 1)/op_objs.length*100, 10) + '%').show();
                                                    if (op == 'mv') {
                                                        dirents.remove(op_obj);
                                                    }
                                                    endOrContinue();
                                                } else { // failed or canceled
                                                    if (data['failed']) {
                                                        var error_msg = op == 'mv' ? gettext('Failed to move %(name)s') : gettext('Failed to copy %(name)s');
                                                        cancel_btn.after('<p class="error">' + error_msg.replace('%(name)s', Common.HTMLescape(obj_name)) + '</p>');
                                                        end();
                                                    }
                                                }
                                            }
                                        },
                                        error: function(xhr, textStatus, errorThrown) {
                                            var error;
                                            if (xhr.responseText) {
                                                error = $.parseJSON(xhr.responseText).error;
                                            } else {
                                                error = gettext("Failed. Please check the network.");
                                            }
                                            cancel_btn.after('<p class="error">' + error + '</p>');
                                            end();
                                        }
                                    });
                                }; // 'req_progress' ends
                                if (i == 0) {
                                    $.modal.close();
                                    setTimeout(function () {
                                        mv_progress_popup.modal({containerCss: {
                                            width: 300,
                                            height: 150,
                                            paddingTop: 50
                                        }, focus:false});
                                        $('#mv-progress').progressbar();
                                        req_progress();
                                    }, 100);
                                } else {
                                    req_progress();
                                }
                            }; // 'after_op_success' ends
                            Common.ajaxPost({
                                'form': form,
                                'post_url': post_url,
                                'post_data': post_data,
                                'after_op_success': after_op_success,
                                'form_id': form.attr('id')
                            });
                        }; // 'mvcpDirent' ends
                        var endOrContinue = function () {
                            if (i == op_objs.length - 1) {
                                setTimeout(function () { $.modal.close(); }, 500);
                            } else {
                                mvcpDirent(++i);
                            }
                        };
                        var end = function () {
                            setTimeout(function () { $.modal.close(); }, 500);
                        };
                        mvcpDirent();
                        cancel_btn.click(function() {
                            Common.disableButton(cancel_btn);
                            var task_id = $(this).data('task_id');
                            $.ajax({
                                url: Common.getUrl({name:'cancel_cp'}) + '?task_id=' + encodeURIComponent(task_id),
                                dataType: 'json',
                                success: function(data) {
                                    other_info.html(gettext("Canceled.")).removeClass('hide');
                                    cancel_btn.addClass('hide');
                                    end();
                                },
                                error: function(xhr, textStatus, errorThrown) {
                                    var error;
                                    if (xhr.responseText) {
                                        error = $.parseJSON(xhr.responseText).error;
                                    } else {
                                        error = gettext("Failed. Please check the network.");
                                    }
                                    other_info.html(error).removeClass('hide');
                                    Common.enableButton(cancel_btn);
                                }
                            });
                        });
                    }
                    return false;
                });
            },

            onWindowScroll: function () {
                var dir = this.dir,
                    start = dir.more_start,
                    loading_tip = this.$('.loading-tip'),
                    _this = this;

                if (dir.dirent_more && $(window).scrollTop() + $(window).height() > $(document).height() - $('#footer').outerHeight(true) && start != dir.last_start) {
                    dir.last_start = start;
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
                            _this.renderThumbnail();
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
