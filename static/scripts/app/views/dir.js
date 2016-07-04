define([
    'jquery',
    'jquery.ui.progressbar',
    'jquery.magnific-popup',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'js.cookie',
    'app/collections/dirents',
    'app/views/dirent',
    'app/views/dirent-grid',
    'app/views/fileupload',
    'app/views/share',
    'app/views/widgets/dropdown'
    ], function($, progressbar, magnificPopup, simplemodal, _, Backbone, Common,
        FileTree, Cookies, DirentCollection, DirentView, DirentGridView,
        FileUploadView, ShareView, DropdownView) {
        'use strict';

        var DirView = Backbone.View.extend({
            id: 'dir-view',

            template: _.template($('#dir-view-tmpl').html()),

            path_bar_template: _.template($('#dir-path-bar-tmpl').html()),
            dir_op_bar_template: _.template($('#dir-op-bar-tmpl').html()),
            dirents_hd_template: _.template($('#dirents-hd-tmpl').html()),
            top_search_form_template: _.template($('#top-search-form-tmpl').html()),

            newDirTemplate: _.template($("#add-new-dir-form-template").html()),
            newFileTemplate: _.template($("#add-new-file-form-template").html()),
            mvcpTemplate: _.template($("#mvcp-form-template").html()),
            mvProgressTemplate: _.template($("#mv-progress-popup-template").html()),

            initialize: function(options) {
                var view_mode = Cookies.get('view_mode');
                if (view_mode == 'grid') {
                    this.view_mode = 'grid';
                } else {
                    this.view_mode = 'list';
                }

                var sort_mode = Cookies.get('sort_mode');
                if (sort_mode == 'time_up') {
                    this.sort_mode = 'time_up';
                } else if (sort_mode == 'time_down') {
                    this.sort_mode = 'time_down';
                } else if (sort_mode == 'name_down') {
                    this.sort_mode = 'name_down';
                } else {
                    this.sort_mode = 'name_up';
                }

                this.contextOptions = {};

                this.dir = new DirentCollection();
                this.listenTo(this.dir, 'add', this.addOne);
                this.listenTo(this.dir, 'reset', this.reset);

                this.fileUploadView = new FileUploadView({dirView: this});

                this.render();


                // scroll window: get 'more', fix 'op bar'
                var _this = this;
                $(window).scroll(function() {
                    if ($(_this.el).is(':visible')) {
                        _this.onWindowScroll();
                    }
                });

                // hide 'rename form'
                $(document).click(function(e) {
                    var target =  e.target || event.srcElement;
                    var $form = $('#rename-form');
                    if ($form.length && !$form.find('*').is(target)) {
                        var $tr = $form.closest('tr'); // get $tr before $form removed in `.cancel click()`
                        $('.cancel', $form).click();
                    }
                });

                // for 'grid view': click to hide the contextmenu of '.grid-item'
                $(document).click(function(e) {
                    var target =  e.target || event.srcElement;
                    var $popup = $('.grid-item-op');
                    if ($popup.length > 0 &&
                        !$popup.is(target) &&
                        !$popup.find('*').is(target) &&
                        !$popup.closest('.grid-item').is(target) &&
                        !$popup.closest('.grid-item').find('*').is(target)) {
                        $popup.remove();
                    }
                });

            },

            render: function() {
                this.$el.html(this.template());
                this.attached = false;
                this.$dirent_list = this.$('.repo-file-list');
                this.$dirent_grid = this.$('.grid-view');
                this.$dirent_list_body = this.$('.repo-file-list tbody');
                this.$loading_tip = this.$('.loading-tip');
                this.$error = this.$('.error');
                this.$el_con = this.$('.repo-file-list-topbar, .js-dir-content');

                this.$path_bar = this.$('.path-bar');
                // For compatible with css, we use .repo-op instead of .dir-op
                this.$dir_op_bar = this.$('.repo-op');

                // magnificPopup for image files
                var magnificPopupOptions = {
                    type: 'image',
                    tClose: gettext("Close (Esc)"), // Alt text on close button
                    tLoading: gettext("Loading..."), // Text that is displayed during loading. Can contain %curr% and %total% keys
                    gallery: {
                        enabled: true,
                        tPrev: gettext("Previous (Left arrow key)"), // Alt text on left arrow
                        tNext: gettext("Next (Right arrow key)"), // Alt text on right arrow
                        tCounter: gettext("%curr% of %total%") // Markup for "1 of 7" counter
                    },
                    image: {
                        tError: gettext('<a href="%url%" target="_blank">The image</a> could not be loaded.') // Error message when image could not be loaded
                    }
                };
                // magnificPopup: for 'list view'
                this.$dirent_list.magnificPopup($.extend({}, magnificPopupOptions, {
                    delegate: '.img-name-link',
                    image: {
                        titleSrc: function(item) {
                            var el = item.el;
                            var img_name = el[0].innerHTML;
                            var img_link = '<a href="' + el.attr('href') + '" target="_blank">' + gettext("Open in New Tab") + '</a>';
                            return img_name + '<br />' + img_link;
                        }
                    }
                }));
                // magnificPopup: for 'grid view'
                this.$dirent_grid.magnificPopup($.extend({}, magnificPopupOptions, {
                    delegate: '.image-grid-item',
                    image: {
                        titleSrc: function(item) {
                            var $el = $(item.el);
                            var img_name = Common.HTMLescape($el.attr('data-name'));
                            var img_link = '<a href="' + $el.attr('data-url') + '" target="_blank">' + gettext("Open in New Tab") + '</a>';
                            return img_name + '<br />' + img_link;
                        }
                    }
                }));

            },

            // public function
            // show a folder
            // 'category' is sth. like url prefix
            // options: for rendering from group view, currently is { group_name: group_name }
            showDir: function(category, repo_id, path, options) {
                $('#top-search-form').html(this.top_search_form_template({
                    search_repo_id: repo_id
                }));

                this.contextOptions = options;
                if (!this.attached) {
                    this.attached = true;
                    $("#right-panel").html(this.$el);
                }
                this.dir.setPath(category, repo_id, path);
                this.renderDir();
            },

            // public function
            // hide the folder view
            hide: function() {
                $('#top-search-form').html(this.top_search_form_template({
                    search_repo_id: ''
                }));

                this.$el.detach();
                this.attached = false;
            },

            /***** private functions *****/
            addOne: function(dirent) {
                var view;
                if (this.view_mode == 'list') {
                    view = new DirentView({model: dirent, dirView: this});
                    this.$dirent_list_body.append(view.render().el);
                } else {
                    view = new DirentGridView({model: dirent, dirView: this});
                    this.$dirent_grid.append(view.render().el);
                }
            },

            reset: function() {
                this.renderPath();
                this.renderDirOpBar();
                if (this.view_mode == 'list') {
                    this.renderDirentsHd();
                }

                this.updateSortIconByMode(this.sort_mode);
                this.sortDirents(this.sort_mode);

                this.dir.last_start = 0;
                this.dir.limit = 100;
                this.render_dirents_slice(this.dir.last_start, this.dir.limit);

                this.setFileInput();

                this.getImageThumbnail();
            },

            // for fileupload
            setFileInput: function () {
                var dir = this.dir;
                if (!dir.user_perm || dir.user_perm != 'rw') {
                    return;
                }

                var $popup = this.fileUploadView.$el;

                if (app.pageOptions.enable_upload_folder) {
                    if ('webkitdirectory' in $('#basic-upload-input')[0]) {
                        // if enable_upload_folder and is chrome
                        this.$("#basic-upload").remove();
                        this.$("#advanced-upload").show();
                        this.upload_dropdown = new DropdownView({
                            el: this.$("#advanced-upload")
                        });
                        $popup.fileupload(
                            'option',
                            'fileInput',
                            this.$('#advanced-upload input[type="file"]'));
                    } else {
                        this.$("#advanced-upload").remove();
                        $popup.fileupload(
                            'option',
                            'fileInput',
                            this.$('#basic-upload-input'));
                    }
                } else {
                    $popup.fileupload(
                        'option',
                        'fileInput',
                        this.$('#basic-upload-input'));
                }
            },

            getImageThumbnail: function() {
                if (!app.pageOptions.enable_thumbnail || this.dir.encrypted) {
                    return false;
                }

                var images_with_no_thumbnail = this.dir.filter(function(dirent) {
                    // 'dirent' is a model
                    return dirent.get('is_img') && !dirent.get('encoded_thumbnail_src');
                });
                if (images_with_no_thumbnail.length == 0) {
                    return ;
                }

                var images_len = images_with_no_thumbnail.length,
                    repo_id = this.dir.repo_id,
                    cur_path = this.dir.path,
                    _this = this;
                var thumbnail_size = app.pageOptions.thumbnail_default_size;
                if (this.view_mode == 'grid') {
                    thumbnail_size = app.pageOptions.thumbnail_size_for_grid;
                }
                var get_thumbnail = function(i) {
                    var cur_img = images_with_no_thumbnail[i];
                    var cur_img_path = Common.pathJoin([cur_path, cur_img.get('obj_name')]);
                    $.ajax({
                        url: Common.getUrl({name: 'thumbnail_create', repo_id: repo_id}),
                        data: {
                            'path': cur_img_path,
                            'size': thumbnail_size
                        },
                        cache: false,
                        dataType: 'json',
                        success: function(data) {
                            cur_img.set({
                                'encoded_thumbnail_src': data.encoded_thumbnail_src
                            });
                        },
                        complete: function() {
                            // cur path may be changed. e.g., the user enter another directory
                            if (i < images_len - 1 &&
                                _this.dir.repo_id == repo_id &&
                                _this.dir.path == cur_path) {
                                get_thumbnail(++i);
                            }
                        }
                    });
                };
                get_thumbnail(0);
            },

            _showLibDecryptDialog: function() {
                var _this = this;
                var form = $($('#repo-decrypt-form-template').html());
                var decrypt_success = false;
                form.modal({
                    containerCss: {'padding': '1px'},
                    onClose: function () {
                        $.modal.close();
                        _this.$el_con.show();
                        if (!decrypt_success) {
                            app.router.navigate(
                                _this.dir.category + '/', // need to append '/' at end
                                {trigger: true}
                            );
                        }
                    }
                });
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
                        post_url: Common.getUrl({
                            'name': 'api_v2.1_repo_set_password',
                            'repo_id': _this.dir.repo_id
                        }),
                        post_data: {
                            password: passwd
                        },
                        after_op_success: function() {
                            decrypt_success = true;
                            $.modal.close();
                            _this.renderDir();
                        }
                    });
                    return false;
                });
            },

            renderDir: function() {
                this.$loading_tip.show();
                this.$error.hide();
                this.$el_con.show();

                this.$dirent_grid.empty();
                this.$dirent_list_body.empty();

                if (this.view_mode == 'list') {
                    this.$dirent_list.show();
                    this.$dirent_grid.hide();
                } else {
                    this.$dirent_list.hide();
                    this.$dirent_grid.show();
                }

                var _this = this;
                var thumbnail_size = app.pageOptions.thumbnail_default_size;
                if (this.view_mode == 'grid') {
                    thumbnail_size = app.pageOptions.thumbnail_size_for_grid;
                }
                var dir = this.dir;
                dir.fetch({
                    cache: false,
                    reset: true,
                    data: {
                        'p': dir.path,
                        'thumbnail_size': thumbnail_size
                    },
                    success: function() {
                        _this.$loading_tip.hide();
                    },
                    error: function(collection, response, opts) {
                        _this.$loading_tip.hide();
                        _this.$el_con.hide();

                        var err_msg;
                        if (response.responseText) {
                            if (response.responseJSON.lib_need_decrypt) {
                                _this._showLibDecryptDialog();
                                return;
                            } else {
                                err_msg = response.responseJSON.error;
                            }
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        _this.$error.html(err_msg).show();
                    }
                });
            },

            renderPath: function() {
                var dir = this.dir;
                var path = dir.path;
                var context = 'my';

                var category_start = dir.category.split('/')[0];
                if (category_start == 'org') {
                    context = 'org';
                } else if (category_start == 'group') {
                    context = 'group';
                } else if (category_start == 'common') {
                    context = 'common';
                }
                var obj = {
                    path: path,
                    repo_name: dir.repo_name,
                    category: dir.category,
                    context: context
                };
                $.extend(obj, this.contextOptions);

                var path_list = path.substr(1).split('/');
                var path_list_encoded = Common.encodePath(path.substr(1)).split('/');
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
                var dir = this.dir;

                this.$dir_op_bar.html($.trim(this.dir_op_bar_template({
                    user_perm: dir.user_perm,
                    encrypted: dir.encrypted,
                    mode: this.view_mode,
                    path: dir.path,
                    repo_id: dir.repo_id,
                    site_root: app.pageOptions.site_root,
                    can_generate_shared_link: app.pageOptions.can_generate_shared_link,
                    enable_upload_folder: app.pageOptions.enable_upload_folder
                })));
            },

            renderDirentsHd: function() {
                this.$('thead').html(this.dirents_hd_template());
            },

            render_dirents_slice: function(start, limit) {
                var dir = this.dir;
                _.each(dir.slice(start, start + limit), this.addOne, this);
                if (dir.length > start + limit) {
                    dir.dirent_more = true;
                    dir.last_start = start + limit;
                } else {
                    dir.dirent_more = false;
                }
            },

            // Directory Operations
            events: {
                'click .path-link': 'visitDir',
                'click #add-new-dir': 'newDir',
                'click #add-new-file': 'newFile',
                'click #share-cur-dir': 'share',
                'click #js-switch-grid-view': 'switchToGridView',
                'click #js-switch-list-view': 'switchToListView',
                'click th.select': 'select',
                'click #mv-dirents': 'mv',
                'click #cp-dirents': 'cp',
                'click #del-dirents': 'del',
                'click #download-dirents': 'download',
                'click .by-name': 'sortByName',
                'click .by-time': 'sortByTime',
                'click .basic-upload-btn': 'uploadFile',
                'click .advanced-upload-file': 'advancedUploadFile',
                'click .advanced-upload-folder': 'advancedUploadFolder'
            },

            uploadFile: function() {
                this.$('#basic-upload-input').trigger('click');
            },

            advancedUploadFile: function() {
                this.$('#advanced-upload-file-input').trigger('click');
                return false;
            },

            advancedUploadFolder: function() {
                this.$('#advanced-upload-folder-input').trigger('click');
                return false;
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

                    var post_data = { 'operation': 'mkdir' },
                        post_url = Common.getUrl({name: "new_dir", repo_id: dir.repo_id})
                                   + '?p=' + encodeURIComponent(Common.pathJoin([dir.path, dirent_name]));
                    var after_op_success = function(data) {
                        $.modal.close();

                        var new_dirent = dir.add({
                            'is_dir': true,
                            'obj_name': data['obj_name'],
                            'perm': 'rw',
                            'last_modified': new Date().getTime() / 1000,
                            'last_update': gettext("Just now"),
                            'p_dpath': Common.pathJoin([dir.path, data['obj_name']])
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
                file_name.focus();
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

                    var post_data = { 'operation': 'create' },
                        post_url = Common.getUrl({name: "new_file", repo_id: dir.repo_id})
                                   + '?p=' + encodeURIComponent(Common.pathJoin([dir.path, dirent_name]));
                    var after_op_success = function(data) {
                        $.modal.close();
                        var new_dirent = dir.add({
                            'is_file': true,
                            'is_img': Common.imageCheck(data['obj_name']),
                            'obj_name': data['obj_name'],
                            'file_size': Common.fileSizeFormat(0),
                            'obj_id': '0000000000000000000000000000000000000000',
                            'file_icon': 'file.png',
                            'starred': false,
                            'perm': 'rw',
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

                if (this.view_mode == 'list') {
                    var view = new DirentView({model: new_dirent, dirView: dirView});
                    var new_file = view.render().el;
                    // put the new file as the first file
                    if ($('tr', dirView.$dirent_list_body).length == 0) {
                        dirView.$dirent_list_body.append(new_file);
                    } else {
                        var dirs = dir.where({'is_dir':true});
                        if (dirs.length == 0) {
                            dirView.$dirent_list_body.prepend(new_file);
                        } else {
                            // put the new file after the last dir
                            $($('tr', dirView.$dirent_list_body)[dirs.length - 1]).after(new_file);
                        }
                    }
                } else {
                    var gview = new DirentGridView({model: new_dirent, dirView: dirView});
                    var grid_new_file = gview.render().el;
                    if ($('.grid-item', dirView.$dirent_grid).length == 0) {
                        dirView.$dirent_grid.append(grid_new_file);
                    } else {
                        var dirs = dir.where({'is_dir':true});
                        if (dirs.length == 0) {
                            dirView.$dirent_grid.prepend(grid_new_file);
                        } else {
                            // put the new file after the last dir
                            $($('.grid-item', dirView.$dirent_grid)[dirs.length - 1]).after(grid_new_file);
                        }
                    }
                }
            },

            addNewDir: function(new_dirent) {
                var dirView = this;
                if (this.view_mode == 'list') {
                    var view = new DirentView({model: new_dirent, dirView: dirView});
                    // put the new dir as the first one
                    dirView.$dirent_list_body.prepend(view.render().el);
                } else {
                    var gview = new DirentGridView({model: new_dirent, dirView: dirView});
                    dirView.$dirent_grid.prepend(gview.render().el);
                }
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

            switchToGridView: function() {
                if (this.view_mode == 'grid') {
                    return false;
                } else {
                    this.view_mode = 'grid';
                    Cookies.set('view_mode', 'grid');
                    this.renderDir();
                    return false;
                }
            },

            switchToListView: function() {
                if (this.view_mode == 'list') {
                    return false;
                } else {
                    this.view_mode = 'list';
                    Cookies.set('view_mode', 'list');
                    this.renderDir();
                    return false;
                }
            },

            sortByName: function() {
                if (this.sort_mode == 'name_up') {
                    // change sort mode
                    Cookies.set('sort_mode', 'name_down');
                    this.sort_mode = 'name_down';
                } else {
                    Cookies.set('sort_mode', 'name_up');
                    this.sort_mode = 'name_up';
                }

                this.updateSortIconByMode(this.sort_mode);
                this.sortDirents(this.sort_mode);

                this.$dirent_list_body.empty();
                this.render_dirents_slice(0, this.dir.limit);
                this.dir.comparator = null;
                return false;
            },

            sortByTime: function () {
                if (this.sort_mode == 'time_up') {
                    // change sort mode
                    Cookies.set('sort_mode', 'time_down');
                    this.sort_mode = 'time_down';
                } else {
                    Cookies.set('sort_mode', 'time_up');
                    this.sort_mode = 'time_up';
                }

                this.updateSortIconByMode(this.sort_mode);
                this.sortDirents(this.sort_mode);

                this.$dirent_list_body.empty();
                this.render_dirents_slice(0, this.dir.limit);
                this.dir.comparator = null;
                return false;
            },

            sortDirents: function(sort_mode) {
                // set collection comparator
                this.dir.comparator = function(a, b) {
                    if (a.get('is_dir') && b.get('is_file')) {
                        return -1;
                    }
                    if (a.get('is_file') && b.get('is_dir')) {
                        return 1;
                    }

                    if (sort_mode == 'name_up' || sort_mode == 'name_down') {
                        // if sort by name
                        var result = Common.compareTwoWord(a.get('obj_name'), b.get('obj_name'));
                        if (sort_mode == 'name_up') {
                            return -result;
                        } else {
                            return result;
                        }
                    } else {
                        // if sort by time
                        if (sort_mode == 'time_up') {
                            return a.get('last_modified') < b.get('last_modified') ? -1 : 1;
                        } else {
                            return a.get('last_modified') < b.get('last_modified') ? 1 : -1;
                        }
                    }
                };

                // sort collection
                this.dir.sort();
            },

            updateSortIconByMode: function(sort_mode) {
                // first hide all icon
                this.$('.by-name .sort-icon, .by-time .sort-icon').hide();

                // show icon according sort mode
                if (sort_mode == 'name_up') {
                    this.$('.by-name .sort-icon').removeClass('icon-caret-up').addClass('icon-caret-down').show();
                } else if (sort_mode == 'name_down') {
                    this.$('.by-name .sort-icon').removeClass('icon-caret-down').addClass('icon-caret-up').show();
                } else if (sort_mode == 'time_up') {
                    this.$('.by-time .sort-icon').removeClass('icon-caret-up').addClass('icon-caret-down').show();
                } else if (sort_mode == 'time_down') {
                    this.$('.by-time .sort-icon').removeClass('icon-caret-down').addClass('icon-caret-up').show();
                } else {
                    // if no sort mode, show name up icon
                    this.$('.by-name .sort-icon').removeClass('icon-caret-down').addClass('icon-caret-up').show();
                }
            },

            select: function () {
                var $el = this.$('th [type=checkbox]');

                var dir = this.dir;
                var $all_dirent_checkbox = this.$('[type=checkbox]');
                var $dirents_op = this.$('#multi-dirents-op');

                var $curDirOps = this.$('#cur-dir-ops');

                if ($el.prop('checked')) {
                    $all_dirent_checkbox.prop('checked', true);
                    dir.each(function(model) {
                        model.set({'selected': true}, {silent: true});
                    });
                    $dirents_op.css({'display':'inline-block'});
                    $curDirOps.hide();
                } else {
                    $all_dirent_checkbox.prop('checked', false);
                    dir.each(function(model) {
                        model.set({'selected': false}, {silent: true});
                    });
                    $dirents_op.hide();
                    $curDirOps.show();
                }
            },

            download: function () {
                var dirents = this.dir;
                var parent_dir = dirents.path;
                var selected_dirents = dirents.where({'selected':true});
                var selected_names = [];
                var interval;
                var zip_token;
                var queryZipProgress = function() {
                    $.ajax({
                        url: Common.getUrl({name: 'query_zip_progress'}) + '?token=' + zip_token,
                        dataType: 'json',
                        cache: false,
                        success: function (data) {
                            if (data['total'] == data['zipped']) {
                                clearInterval(interval);
                                location.href = Common.getUrl({name: 'download_dir_zip_url', zip_token: zip_token});
                            }
                        },
                        error: function (xhr) {
                            Common.ajaxErrorHandler(xhr);
                            clearInterval(interval);
                        }
                    });
                };

                if (selected_dirents.length == 1 && selected_dirents[0].get('is_file')) {
                    // only select one file
                    var file_path = parent_dir + '/' + selected_dirents[0].get('obj_name');
                    location.href = Common.getUrl({name: 'get_file_download_url', repo_id: dirents.repo_id, file_path: encodeURIComponent(file_path)});
                    return false
                }

                $(selected_dirents).each(function() {
                    selected_names.push(this.get('obj_name'));
                });

                $.ajax({
                    url: Common.getUrl({name: 'zip_task', repo_id: dirents.repo_id}),
                    data: {
                        'parent_dir': parent_dir,
                        'dirents': selected_names
                    },
                    dataType: 'json',
                    traditional: true,
                    success: function(data) {
                        zip_token = data['zip_token'];
                        queryZipProgress();
                        interval = setInterval(queryZipProgress, 1000);
                    },
                    error: function (xhr) {
                        Common.ajaxErrorHandler(xhr);
                    }
                });
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
                                        if (data['deleted'].indexOf(this.get('obj_name')) != -1) {
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
                                msg_s = msg_s.replace('%(name)s', data['deleted'][0]).replace('%(amount)s', del_len - 1);
                                Common.feedback(msg_s, 'success');
                            }
                            if (not_del_len > 0) {
                                if (not_del_len == 1) {
                                    msg_f = gettext("Failed to delete %(name)s.");
                                } else if (not_del_len == 2) {
                                    msg_f = gettext("Failed to delete %(name)s and 1 other item.");
                                } else {
                                    msg_f = gettext("Failed to delete %(name)s and %(amount)s other items.");
                                }
                                msg_f = msg_f.replace('%(name)s', data['undeleted'][0]).replace('%(amount)s', not_del_len - 1);
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

                var title = op == 'mv' ? gettext("Move selected item(s) to:") : gettext("Copy selected item(s) to:");

                var show_cur_repo = true;
                if (dir.user_perm == 'r') {
                    show_cur_repo = false;
                }

                var form = $(this.mvcpTemplate({
                    form_title: title,
                    op_type: op,
                    obj_type: '',
                    obj_name: '',
                    show_cur_repo: show_cur_repo,
                    show_other_repos: !dir.encrypted
                }));
                form.modal({appendTo:'#main', autoResize:true, focus:false});
                $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

                if (show_cur_repo) {
                    FileTree.renderTreeForPath({
                        $form: form,
                        $container: $('#current-repo-dirs'),
                        repo_name: dir.repo_name,
                        repo_id: dir.repo_id,
                        path: dir.path
                    });
                }
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

                                    msg_s = msg_s.replace('%(name)s', data['success'][0]).replace('%(amount)s', success_len - 1);
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
                                    msg_f = msg_f.replace('%(name)s', data['failed'][0]).replace('%(amount)s', data['failed'].length - 1);
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
                // 'more'
                if (this.dir.dirent_more &&
                        $(window).scrollTop() + $(window).height() > $(document).height() - $('#footer').outerHeight(true)) {

                    this.render_dirents_slice(this.dir.last_start, this.dir.limit);
                    this.getImageThumbnail();
                }

                // fixed 'dir-op-bar'
                var op_bar = this.$dir_op_bar,
                    path_bar = this.$path_bar, // the element before op_bar
                    repo_file_list = this.$('.repo-file-list'); // the element after op_bar
                var op_bar_top = path_bar.offset().top + path_bar.outerHeight(true);
                var fixed_styles = {
                    'position': 'fixed',
                    'top': 0,
                    'left': path_bar.offset().left,
                    'background-color': $('#header').css('background-color'),
                    'z-index': 12 // make 'op_bar' shown on top of the checkboxes
                };
                if ($(window).scrollTop() >= op_bar_top) {
                    repo_file_list.css({'margin-top':op_bar.outerHeight(true)});
                    op_bar.outerWidth(this.$el.width()).css(fixed_styles);
                } else {
                    repo_file_list.css({'margin-top':0});
                    op_bar.removeAttr('style');
                }
            }

      });

      return DirView;
});
