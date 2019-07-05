define([
    'jquery',
    'jquery.ui',
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
    'app/views/dirent-details',
    'app/views/fileupload',
    'app/views/share',
    'app/views/file-comments',
    'app/views/widgets/dropdown'
    ], function($, jQueryUI, magnificPopup, simplemodal, _, Backbone, Common,
        FileTree, Cookies, DirentCollection, DirentView, DirentGridView,
        DirentDetailsView, FileUploadView, ShareView, FileCommentsView, DropdownView) {
        'use strict';

        var DirView = Backbone.View.extend({
            el: '.main-panel',

            template: _.template($('#dir-view-tmpl').html()),

            toolbarTemplate: _.template($('#dir-view-toolbar-tmpl').html()),
            toolbar2Template: _.template($('#dir-view-toolbar2-tmpl').html()),

            pathTemplate: _.template($('#dir-view-path-tmpl').html()),

            theadTemplate: _.template($('#dir-view-thead-tmpl').html()), // '<thead>'
            theadMobileTemplate: _.template($('#dir-view-thead-mobile-tmpl').html()),

            newDirTemplate: _.template($("#add-new-dir-form-template").html()),
            newFileTemplate: _.template($("#add-new-file-form-template").html()),
            mvcpTemplate: _.template($("#mvcp-form-template").html()),
            mvProgressTemplate: _.template($("#mv-progress-popup-template").html()),

            topSearchFormTemplate: _.template($('#top-search-form-tmpl').html()),
            repoDecryptFormTemplate: _.template($('#repo-decrypt-form-template').html()),

            initialize: function(options) {
                var view_mode = Cookies.get('view_mode');
                if (view_mode == 'grid') {
                    this.view_mode = 'grid';
                } else if (view_mode == 'wiki'){
                    this.view_mode = 'wiki';
                } else {
                    this.view_mode = 'list';
                }

                this.contextOptions = {};

                // for image files
                this.magnificPopupOptions = {
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
                        titleSrc: function(item) {
                            var img_name = Common.HTMLescape(item.data.name);
                            var img_link = '<a href="' + item.data.url + '" target="_blank">' + gettext("Open in New Tab") + '</a>';
                            return img_name + '<br />' + img_link;
                        },
                        tError: gettext('<a href="%url%" target="_blank">The image</a> could not be loaded.') // Error message when image could not be loaded
                    }
                };

                this.dir = new DirentCollection();
                this.listenTo(this.dir, 'add', this.addOne);
                this.listenTo(this.dir, 'reset', this.reset);

                this.fileUploadView = new FileUploadView({dirView: this});
                this.direntDetailsView = new DirentDetailsView({dirView: this});
                this.fileCommentsView = new FileCommentsView({dirView: this});

                // hide 'rename form'
                $(document).on('click', function(e) {
                    var target =  e.target || event.srcElement;
                    var $form = $('#rename-form');
                    if ($form.length && !$form.find('*').is(target)) {
                        var $tr = $form.closest('tr'); // get $tr before $form removed in `.cancel click()`
                        $('.cancel', $form).trigger('click');
                    }
                });

                // for 'grid view': click to hide the contextmenu of '.grid-item'
                $(document).on('click', function(e) {
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

                // confirm leaving the page when file is uploading
                window.onbeforeunload = function(e) {
                    if ($('#upload-file-dialog').is(':visible') &&
                        $('#upload-file-dialog .status').text() == window.fileuploading) {
                        return '';
                    }
                };

            },

            renderMainCon: function() {
                if ($('#dir-view').length) {
                    return;
                }

                this.$mainCon = $('<div class="main-panel-main main-panel-main-with-side" id="dir-view"></div>').html(this.template());
                this.$el.append(this.$mainCon);

                this.$loadingTip = this.$('.loading-tip');
                this.$con = this.$('.js-dir-content');
                this.$error = this.$('.error');

                this.$table = this.$('.repo-file-list');
                this.$tbody = $('tbody', this.$table);
                this.$gridViewContainer = this.$('.grid-view');

                var _this = this;
                $('.cur-view-main-con', this.$mainCon).on('scroll', function() {
                    _this.getMore();
                });
            },

            // public function
            // show a folder
            // 'category' is sth. like url prefix
            // options: for rendering from group view, currently is { group_name: group_name }
            showDir: function(category, repo_id, path, options) {
                $('#top-search-form').html(this.topSearchFormTemplate({
                    search_repo_id: repo_id
                }));

                this.contextOptions = options;
                this.renderMainCon();

                this.dir.setPath(category, repo_id, path);
                this.dir.dirent_more = false;
                // goto wiki
                if ( this.view_mode === "wiki") {
                    this.$('.grid-view-icon-btn').removeClass('active');
                    this.$('.list-view-icon-btn').removeClass('active');
                    this.$('.wiki-view-icon-btn').addClass('active');
                    var siteRoot = app.pageOptions.site_root;
                    var repoId = this.dir.repo_id;
                    var path = this.dir.path; 
                    var url = siteRoot + 'wiki/lib/' + repoId + path;
                    
                    window.location = url;
                    return;
                }

                this.renderDir();

            },

            // public function
            // hide the folder view
            hide: function() {
                $('#top-search-form').html(this.topSearchFormTemplate({
                    search_repo_id: ''
                }));


                if (this.$toolbar) { // when an enc lib is not decrypted, no $toolbar
                    this.$toolbar.detach();
                }
                this.$mainCon.detach();
                this.fileUploadView.closePopup();
            },

            /***** private functions *****/
            addOne: function(dirent) {
                var view;
                if (this.view_mode == 'list') {
                    view = new DirentView({model: dirent, dirView: this});
                    this.$tbody.append(view.render().el);
                } else {
                    view = new DirentGridView({model: dirent, dirView: this});
                    this.$gridViewContainer.append(view.render().el);
                }
            },

            // this.view_mode == 'list'
            addListOne: function(dirent) {
                var view = new DirentView({model: dirent, dirView: this});
                this.$tbody.append(view.render().el);
            },

            // 'grid'
            addGridOne: function(dirent) {
                var view = new DirentGridView({model: dirent, dirView: this});
                this.$gridViewContainer.append(view.render().el);
            },

            reset: function() {
                this.renderToolbar();
                this.renderPath();

                this.$con.hide();

                this.$table.hide();
                this.$tbody.empty();
                this.$gridViewContainer.hide().empty();

                this.$con.show();

                if (this.view_mode == 'list') {
                    this.renderThead();
                    Common.updateSortIconByMode({'context': this.$table});
                    this.$table.show();
                } else {
                    this.$gridViewContainer.show();
                }

                // sort
                this.sortDirents();

                this.dir.last_start = 0;
                this.dir.limit = 100;
                this.render_dirents_slice(this.dir.last_start, this.dir.limit);

                this.getThumbnail();
            },

            updateMagnificPopupOptions: function(options) {
                var repo_id = this.dir.repo_id,
                    path = this.dir.path;

                var use_thumbnail = true;
                if (!app.pageOptions.enable_thumbnail || this.dir.encrypted) {
                    use_thumbnail = false;
                }
                var genItem = function(model) {
                    var name = model.get('obj_name');
                    var dirent_path = Common.pathJoin([path, name]);
                    var url_options = {
                        'repo_id': repo_id,
                        'path': Common.encodePath(dirent_path)
                    };

                    var file_ext = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
                    var is_gif = file_ext == 'gif' ? true : false;
                    var item_src;
                    if (use_thumbnail && !is_gif) {
                        item_src = Common.getUrl($.extend(url_options, {
                            'name': 'thumbnail_get',
                            'size': app.pageOptions.thumbnail_size_for_original
                        }));
                    } else {
                        item_src = Common.getUrl($.extend(url_options, {
                            'name': 'view_raw_file'
                        }));
                    }

                    var item = {
                        'name': name,
                        'url': model.getWebUrl(),
                        'src': item_src
                    };
                    return item;
                };

                var _this = this;
                var getItems = function() {
                    var imgs = _this.dir.where({is_img: true});
                    var items = [];
                    $(imgs).each(function(index, model) {
                        var item = genItem(model);
                        items.push(item);
                    });
                    _this.magnificPopupOptions.items = items;
                };

                var addNewItem = function(model) {
                    var item = genItem(model);
                    // add the new item as the first
                    _this.magnificPopupOptions.items.unshift(item);
                };

                var updateItem = function(index, model) {
                    var item = genItem(model);
                    _this.magnificPopupOptions.items[index] = item;
                };

                var deleteItem = function(index) {
                    _this.magnificPopupOptions.items.splice(index, 1);
                };

                var op = options ? options.op : 'get-items';
                switch (op) {
                    case 'get-items':
                        getItems();
                        break;
                    case 'add-new-item':
                        addNewItem(options.model);
                        break;
                    case 'update-item':
                        updateItem(options.index, options.model);
                        break;
                    case 'delete-item':
                        deleteItem(options.index);
                        break;
                }
            },

            // for fileupload
            setFileInput: function() {
                var dir = this.dir;
                if (!dir.user_perm || dir.user_perm != 'rw') {
                    return;
                }
                if (dir.no_quota) {
                    return;
                }

                var $popup = this.fileUploadView.$el;

                if (app.pageOptions.enable_upload_folder) {
                    if ('webkitdirectory' in $('.basic-upload-input')[0]) {
                        this.$("#basic-upload").remove();
                        this.$("#advanced-upload").show();
                        this.upload_dropdown = new DropdownView({
                            el: this.$("#advanced-upload")
                        });
                        $popup.fileupload(
                            'option', {
                                fileInput: this.$('#advanced-upload input[type="file"]'),
                                // set 'replaceFileInput: false' for Firefox(v50)
                                replaceFileInput: navigator.userAgent.indexOf('Firefox') == -1 ? true : false
                            });
                    } else {
                        this.$("#advanced-upload").remove();
                        $popup.fileupload(
                            'option',
                            'fileInput',
                            this.$('.basic-upload-input:eq(0)'));
                    }
                } else {
                    $popup.fileupload(
                        'option',
                        'fileInput',
                        this.$('.basic-upload-input:eq(0)'));
                }
            },

            getThumbnail: function() {
                if (!app.pageOptions.enable_thumbnail || this.dir.encrypted) {
                    return false;
                }

                var items = this.dir.filter(function(dirent) {
                    // 'dirent' is a model
                    return (dirent.get('is_img') || dirent.get('is_xmind') || dirent.get('is_video')) && !dirent.get('encoded_thumbnail_src');
                });
                if (items.length == 0) {
                    return ;
                }

                var items_length = items.length,
                    repo_id = this.dir.repo_id,
                    cur_path = this.dir.path,
                    _this = this;
                var thumbnail_size = app.pageOptions.thumbnail_default_size;
                if (this.view_mode == 'grid') {
                    thumbnail_size = app.pageOptions.thumbnail_size_for_grid;
                }
                var get_thumbnail = function(i) {
                    var cur_item = items[i];
                    var cur_item_path = Common.pathJoin([cur_path, cur_item.get('obj_name')]);
                    $.ajax({
                        url: Common.getUrl({name: 'thumbnail_create', repo_id: repo_id}),
                        data: {
                            'path': cur_item_path,
                            'size': thumbnail_size
                        },
                        cache: false,
                        dataType: 'json',
                        success: function(data) {
                            cur_item.set({
                                'encoded_thumbnail_src': data.encoded_thumbnail_src
                            });
                        },
                        complete: function() {
                            // cur path may be changed. e.g., the user enter another directory
                            if (i < items_length - 1 &&
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
                var $form = $(this.repoDecryptFormTemplate());
                var decrypt_success = false;
                $form.modal({
                    containerCss: {'padding': '1px'},
                    onClose: function () {
                        $.modal.close();
                        if (!decrypt_success) {
                            app.router.navigate(
                                _this.dir.category + '/', // need to append '/' at end
                                {trigger: true}
                            );
                        }
                    }
                });
                $('#simplemodal-container').css({'height':'auto'});
                $form.on('submit', function() {
                    var passwd = $.trim($('[name="password"]', $form).val());
                    if (!passwd) {
                        $('.error', $form).html(gettext("Password is required.")).removeClass('hide');
                        return false;
                    }
                    Common.ajaxPost({
                        form: $form,
                        form_id: $form.attr('id'),
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

                this.$loadingTip.show();
                this.$con.hide();
                this.$error.hide();

                var _this = this;
                var thumbnail_size = app.pageOptions.thumbnail_default_size;
                if (this.view_mode == 'grid') {
                    thumbnail_size = app.pageOptions.thumbnail_size_for_grid;
                }
                var dir = this.dir;
                dir.fetch({
                    cache: false,
                    //reset: true,
                    data: {
                        'p': dir.path,
                        'thumbnail_size': thumbnail_size
                    },
                    success: function(collection, response, opts) {

                        if (response.next_url) {
                            window.open(response.next_url, '_self')
                        }

                        _this.dir.user_can_set_folder_perm = false;
                        _this.is_address_book_group_admin = false; // department admin
                        _this.is_group_owned_repo = false;
                        if (_this.contextOptions &&
                            _this.contextOptions.group_id && // the repo is in a group
                            dir.repo_owner.indexOf('@seafile_group') != -1) { // It's a group owned repo
                            _this.is_group_owned_repo = true;
                            _this.getGroupInfo();
                        } else {
                            _this.reset();
                        }
                    },
                    error: function(collection, response, opts) {
                        var err_msg;
                        if (response.responseText) {
                            if (response.responseJSON.lib_need_decrypt) {
                                _this._showLibDecryptDialog();
                                return;
                            } else {
                                err_msg = Common.HTMLescape(response.responseJSON.error);
                            }
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        _this.$error.html(err_msg).show();
                    },
                    complete: function() {
                        _this.$loadingTip.hide();
                    }
                });
            },

            // get department(group) info
            getGroupInfo: function() {
                var _this = this;

                var repo_owner = this.dir.repo_owner; // e.g: 4@seafile_group
                var group_id = repo_owner.substring(0, repo_owner.indexOf('@'));
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group',
                        'group_id': group_id
                    }),
                    cache: false,
                    dataType: 'json',
                    success: function(data) {
                        if ($.inArray(app.pageOptions.username, data.admins) != -1) { // user is group admin
                            _this.dir.user_can_set_folder_perm = true;

                            _this.is_address_book_group_admin = true;
                        }
                    },
                    error: function(xhr) {
                    },
                    complete: function() {
                        _this.reset();
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

                this.$('.dir-path').html(this.pathTemplate(obj));
            },

            renderToolbar: function() {
                var dir = this.dir;

                // show 'share' or not
                var can_share = false;
                if (!dir.encrypted &&
                    (app.pageOptions.can_generate_share_link ||
                    app.pageOptions.can_generate_upload_link ||
                    dir.is_repo_owner || dir.is_admin) &&
                    (dir.user_perm == 'rw' || dir.user_perm == 'r')) {
                    can_share = true;
                }

                var data = {
                    user_perm: dir.user_perm,
                    no_quota: dir.no_quota,
                    encrypted: dir.encrypted,
                    mode: this.view_mode,
                    path: dir.path,
                    repo_id: dir.repo_id,
                    is_repo_owner: dir.is_repo_owner,
                    can_share: can_share,
                    site_root: app.pageOptions.site_root
                };

                if (!$('#dir-view-toolbar').length) {
                    this.$toolbar = $('<div class="cur-view-toolbar d-flex" id="dir-view-toolbar"></div>').html(this.toolbarTemplate(data));
                    this.$('.common-toolbar').before(this.$toolbar);
                } else {
                    this.$toolbar.html(this.toolbarTemplate(data));
                }

                this.$('.dir-toolbar-2').html(this.toolbar2Template(data));

                // for 'upload'
                this.setFileInput();

                if (dir.user_perm == 'rw') {
                    // add new folder/file
                    this.new_dropdown = new DropdownView({
                        el: this.$("#add-new")
                    });
                }
            },

            renderThead: function() {
                var tmpl = $(window).width() < 768 ? this.theadMobileTemplate : this.theadTemplate;
                this.$('thead').html(tmpl());
            },

            render_dirents_slice: function(start, limit) {
                var dir = this.dir;
                var addOne = this.view_mode == 'list' ? this.addListOne : this.addGridOne;
                _.each(dir.slice(start, start + limit), addOne, this);
                if (dir.length > start + limit) {
                    dir.dirent_more = true;
                    dir.last_start = start + limit;
                } else {
                    dir.dirent_more = false;
                }
            },

            // Directory Operations
            events: {
                'click #dir-view-toolbar .basic-upload-btn': 'uploadFile',
                'click #dir-view-toolbar .advanced-upload-file': 'advancedUploadFile',
                'click #dir-view-toolbar .advanced-upload-folder': 'advancedUploadFolder',

                'click #add-new li a': 'closeNewDropdown',
                'click #add-new-dir': 'newDir',
                'click #add-new-file': 'newCommonFile',
                'click #add-new-md-file': 'newMdFile',
                'click #add-new-excel-file': 'newExcelFile',
                'click #add-new-ppt-file': 'newPPTFile',
                'click #add-new-word-file': 'newWordFile',

                'click #share-cur-dir': 'share',
                'click #js-switch-grid-view': 'switchToGridView',
                'click #js-switch-list-view': 'switchToListView',
                'click #js-switch-wiki-view': 'switchdToWikiView',

                'click #mv-dirents': 'mv',
                'click #cp-dirents': 'cp',
                'click #del-dirents': 'del',
                'click #download-dirents': 'download',

                'click #dir-view th.select': 'select',
                'click #dir-view .by-name': 'sortByName',
                'click #dir-view .by-time': 'sortByTime'
                //'scroll #dir-view .cur-view-main-con': 'getMore' // It doesn't work.
            },

            uploadFile: function() {
                this.$('.basic-upload-input').trigger('click');
            },

            advancedUploadFile: function() {
                this.$('#advanced-upload-file-input').trigger('click');
                return false;
            },

            advancedUploadFolder: function() {
                this.$('#advanced-upload-folder-input').trigger('click');
                return false;
            },

            closeNewDropdown: function() {
                this.new_dropdown.hide();
            },

            newDir: function() {
                var form = $(this.newDirTemplate()),
                    form_id = form.attr('id'),
                    dir = this.dir,
                    dirView = this;

                form.modal();
                $('#simplemodal-container').css({'height':'auto'});

                form.on('submit', function() {
                    var dirent_name = $.trim($('input[name="name"]', form).val());

                    if (!dirent_name) {
                        Common.showFormError(form_id, gettext("It is required."));
                        return false;
                    };

                    if (dirent_name.indexOf('/') != -1) {
                        Common.showFormError(form_id, gettext("Name should not include '/'."));
                        return false;
                    }

                    var post_data = {'operation': 'mkdir'},
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
                        'form_id': form_id,
                        'post_url': post_url,
                        'post_data': post_data,
                        'after_op_success': after_op_success
                    });

                    return false;
                });

                return false;
            },

            newFile: function(options) {
                var $form = $(this.newFileTemplate(options)),
                    form_id = $form.attr('id'),
                    $input = $('input[name="name"]', $form),
                    dir = this.dir,
                    dirView = this;

                $form.modal({
                    focus: false,
                    containerCss: {'padding':'20px 25px'}
                });
                $('#simplemodal-container').css({'height':'auto'});

                Common.setCaretPos($input[0], 0);
                $input.trigger('focus');

                $form.on('submit', function() {
                    var dirent_name = $.trim($input.val());

                    if (!dirent_name) {
                        Common.showFormError(form_id, gettext("It is required."));
                        return false;
                    };

                    if (dirent_name.indexOf('/') != -1) {
                        Common.showFormError(form_id, gettext("Name should not include '/'."));
                        return false;
                    }

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
                            'is_img': Common.imageCheck(data.obj_name),
                            'obj_name': data.obj_name,
                            'file_size': Common.fileSizeFormat(data.size),
                            'obj_id': data.obj_id,
                            'file_icon': 'file.png',
                            'starred': false,
                            'perm': 'rw',
                            'last_modified': new Date().getTime() / 1000,
                            'last_update': gettext("Just now")
                        }, {silent: true});
                        dirView.addNewFile(new_dirent);
                    };

                    Common.ajaxPost({
                        'form': $form,
                        'form_id': form_id,
                        'post_url': post_url,
                        'post_data': post_data,
                        'after_op_success': after_op_success
                    });

                    return false;
                });
            },

            newCommonFile: function() {
                this.newFile({
                    title: gettext('New File'),
                    initial_file_name: ''
                });
                return false;
            },

            newMdFile: function() {
                this.newFile({
                    title: gettext('New Markdown File'),
                    initial_file_name: '.md'
                });
                return false;
            },

            newExcelFile: function() {
                this.newFile({
                    title: gettext('New Excel File'),
                    initial_file_name: '.xlsx'
                });
                return false;
            },

            newPPTFile: function() {
                this.newFile({
                    title: gettext('New PowerPoint File'),
                    initial_file_name: '.pptx'
                });
                return false;
            },

            newWordFile: function() {
                this.newFile({
                    title: gettext('New Word File'),
                    initial_file_name: '.docx'
                });
                return false;
            },

            addNewFile: function(new_dirent) {
                var view, $el;
                if (this.view_mode == 'list') {
                    view = new DirentView({model: new_dirent, dirView: this});
                    $el = view.render().el;
                    // put the new file as the first file
                    if ($('tr', this.$tbody).length == 0) {
                        this.$tbody.append($el);
                    } else {
                        var dirs = this.dir.where({'is_dir':true});
                        if (dirs.length == 0) {
                            this.$tbody.prepend($el);
                        } else {
                            // put the new file after the last dir
                            $($('tr', this.$tbody)[dirs.length - 1]).after($el);
                        }
                    }
                } else {
                    view = new DirentGridView({model: new_dirent, dirView: this});
                    $el = view.render().el;
                    if ($('.grid-item', this.$gridViewContainer).length == 0) {
                        this.$gridViewContainer.append($el);
                    } else {
                        var dirs = this.dir.where({'is_dir':true});
                        if (dirs.length == 0) {
                            this.$gridViewContainer.prepend($el);
                        } else {
                            // put the new file after the last dir
                            $($('.grid-item', this.$gridViewContainer)[dirs.length - 1]).after($el);
                        }
                    }
                }

                if (new_dirent.get('is_img')) {
                    this.updateMagnificPopupOptions({'op':'add-new-item', 'model':new_dirent});
                }
            },

            addNewDir: function(new_dirent) {
                // put the new dir as the first one
                var view;
                if (this.view_mode == 'list') {
                    view = new DirentView({model: new_dirent, dirView: this});
                    this.$tbody.prepend(view.render().el);
                } else {
                    view = new DirentGridView({model: new_dirent, dirView: this});
                    this.$gridViewContainer.prepend(view.render().el);
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
                if (app.pageOptions.is_pro) {
                    options.is_admin = dir.is_admin;

                    if (this.is_address_book_group_admin) {
                        $.extend(options, {
                            is_address_book_group_admin: true,
                            is_group_owned_repo: this.is_group_owned_repo
                        });
                    }
                }
                new ShareView(options);
            },

            switchToGridView: function() {
                if (this.view_mode == 'grid') {
                    return;
                } else {
                    this.view_mode = 'grid';
                    Cookies.set('view_mode', 'grid');
                    this.$('.list-view-icon-btn').removeClass('active');
                    this.$('.wiki-view-icon-btn').removeClass('active');
                    this.$('.grid-view-icon-btn').addClass('active');
                    this.renderDir();
                }
            },

            switchToListView: function() {
                if (this.view_mode == 'list') {
                    return;
                } else {
                    this.view_mode = 'list';
                    Cookies.set('view_mode', 'list');
                    this.$('.grid-view-icon-btn').removeClass('active');
                    this.$('.wiki-view-icon-btn').removeClass('active');
                    this.$('.list-view-icon-btn').addClass('active');
                    this.renderDir();
                }
            },

            switchdToWikiView: function() {
                if (this.view_mode == 'wiki') {
                    return;
                } else {
                    this.view_mode = 'wiki';
                    Cookies.set('view_mode', 'wiki');
                    this.$('.grid-view-icon-btn').removeClass('active');
                    this.$('.list-view-icon-btn').removeClass('active');
                    this.$('.wiki-view-icon-btn').addClass('active');
                    var siteRoot = app.pageOptions.site_root;
                    var repoId = this.dir.repo_id;
                    var path = this.dir.path; 
                    var url = siteRoot + 'wiki/lib/' + repoId + path;
                    
                    window.location = url;
                }
            },

            sortDirents: function() {
                var sort_mode = app.pageOptions.sort_mode;
                switch(sort_mode) {
                    case 'name_up':
                        this.dir.comparator = function(a, b) {
                            if (a.get('is_dir') && b.get('is_file')) {
                                return -1;
                            }
                            if (a.get('is_file') && b.get('is_dir')) {
                                return 1;
                            }
                            var result = Common.compareTwoWord(a.get('obj_name'), b.get('obj_name'));
                            return result;
                        };
                        break;
                    case 'name_down':
                        this.dir.comparator = function(a, b) {
                            if (a.get('is_dir') && b.get('is_file')) {
                                return -1;
                            }
                            if (a.get('is_file') && b.get('is_dir')) {
                                return 1;
                            }
                            var result = Common.compareTwoWord(a.get('obj_name'), b.get('obj_name'));
                            return -result;
                        };
                        break;
                    case 'time_up':
                        this.dir.comparator = function(a, b) {
                            if (a.get('is_dir') && b.get('is_file')) {
                                return -1;
                            }
                            if (a.get('is_file') && b.get('is_dir')) {
                                return 1;
                            }
                            return a.get('last_modified') < b.get('last_modified') ? -1 : 1;
                        };
                        break;
                    case 'time_down':
                        this.dir.comparator = function(a, b) {
                            if (a.get('is_dir') && b.get('is_file')) {
                                return -1;
                            }
                            if (a.get('is_file') && b.get('is_dir')) {
                                return 1;
                            }
                            return a.get('last_modified') < b.get('last_modified') ? 1 : -1;
                        };
                        break;
                }

                this.dir.sort();

                this.updateMagnificPopupOptions();
            },

            sortByName: function() {
                Common.toggleSortByNameMode();
                Common.updateSortIconByMode({'context': this.$table});
                this.sortDirents();

                this.$tbody.empty();
                this.render_dirents_slice(0, this.dir.limit);
                this.dir.comparator = null;
                return false;
            },

            sortByTime: function () {
                Common.toggleSortByTimeMode();
                Common.updateSortIconByMode({'context': this.$table});
                this.sortDirents();

                this.$tbody.empty();
                this.render_dirents_slice(0, this.dir.limit);
                this.dir.comparator = null;
                return false;
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
                    $dirents_op.show();
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
                var selected_dirents = dirents.where({'selected':true});
                var selected_names = [];

                // select 1 item, and it is a file
                if (selected_dirents.length == 1 &&
                    selected_dirents[0].get('is_file')) {
                    location.href = selected_dirents[0].getDownloadUrl();
                    return;
                }
                $(selected_dirents).each(function() {
                    selected_names.push(this.get('obj_name'));
                });

                Common.zipDownload(dirents.repo_id, dirents.path, selected_names);
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
                        success: function(data) { // data['deleted']: [name,]
                            var del_len = data['deleted'].length,
                                not_del_len = data['undeleted'].length,
                                msg_s, msg_f;

                            if (del_len > 0) {
                                if (del_len == selected_names.length) {
                                    dirents.remove(selected_dirents);
                                    $('th [type=checkbox]', _this.$table).prop('checked', false);
                                    _this.$('#multi-dirents-op').hide();
                                    _this.$('#cur-dir-ops').show();
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

                                _this.updateMagnificPopupOptions(); // after Successfully deleting some items
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
                form.modal({autoResize:true, focus:false});
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
                form.on('submit', function() {
                    var dst_repo = $('[name="dst_repo"]', form).val(),
                        dst_path = $('[name="dst_path"]', form).val(),
                        url_main;
                    var cur_path = dirents.path;
                    var url_obj = {repo_id:dirents.repo_id};

                    if (!$.trim(dst_repo) || !$.trim(dst_path)) {
                        $('.error', form).removeClass('hide');
                        return false;
                    }
                    if (dst_repo == dirents.repo_id &&
                        (op == 'mv' && dst_path == cur_path)) {
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
                                            _this.$('#cur-dir-ops').show();
                                        } else {
                                            $(dirs).each(function() {
                                                if (data['success'].indexOf(this.get('obj_name')) != -1) {
                                                    dirents.remove(this);
                                                }
                                            });
                                            $(files).each(function() {
                                                if (data['success'].indexOf(this.get('obj_name')) != -1) {
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
                                        _this.updateMagnificPopupOptions(); // after moving items in the same library
                                    } else { // cp
                                        if (success_len == 1) {
                                            msg_s = gettext("Successfully copied %(name)s.");
                                        } else if (success_len == 2) {
                                            msg_s = gettext("Successfully copied %(name)s and 1 other item.");
                                        } else {
                                            msg_s = gettext("Successfully copied %(name)s and %(amount)s other items.");
                                        }

                                        // show the added items
                                        if (dst_path == cur_path) {
                                            _this.renderDir();
                                        }
                                    }

                                    msg_s = msg_s.replace('%(name)s', data['success'][0]).replace('%(amount)s', success_len - 1);
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
                            i = 0,
                            success_num = 0,
                            first_item;
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

                            post_url = Common.getUrl({'name': 'copy_move_task'});
                            post_data = {
                                'src_repo_id': dirents.repo_id,
                                'src_parent_dir': cur_path,
                                'src_dirent_name': obj_name,
                                'dst_repo_id': dst_repo,
                                'dst_parent_dir': dst_path,
                                'operation': op == 'mv' ? 'move' : 'copy',
                                'dirent_type': obj_type
                            };
                            var after_op_success = function (data) {
                                var det_text = op == 'mv' ? gettext("Moving file %(index)s of %(total)s") : gettext("Copying file %(index)s of %(total)s");
                                details.html(det_text.replace('%(index)s', i + 1).replace('%(total)s', op_objs.length)).removeClass('vh');
                                cancel_btn.removeClass('hide');
                                var req_progress = function () {
                                    var task_id = data['task_id'];
                                    cancel_btn.data('task_id', task_id);
                                    $.ajax({
                                        url: Common.getUrl({name:'query_copy_move_progress'}) + '?task_id=' + encodeURIComponent(task_id),
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
                                                    success_num += 1;
                                                    if (success_num == 1) {
                                                        first_item = obj_name;
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
                                            var error_msg = Common.prepareAjaxErrorMsg(xhr);
                                            cancel_btn.after('<p class="error">' + error_msg + '</p>');
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
                            $.ajax({
                                url: post_url,
                                type: 'POST',
                                dataType: 'json',
                                beforeSend: Common.prepareCSRFToken,
                                data: post_data,
                                success: after_op_success,
                                error: function(xhr) {
                                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                                    if (form.is(':visible')) {
                                        $('.error', form).html(error_msg).show();
                                    } else {
                                        cancel_btn.after('<p class="error">' + error_msg + '</p>');
                                        cancel_btn.hide();
                                    }
                                }
                            });
                        }; // 'mvcpDirent' ends
                        var endOrContinue = function () {
                            if (i == op_objs.length - 1) {
                                setTimeout(function () { $.modal.close(); }, 500);
                                if (op == 'mv') {
                                    _this.updateMagnificPopupOptions();
                                }
                                if (success_num > 0) {
                                    var msg_s;
                                    if (op == 'mv') {
                                        if (success_num == 1) {
                                            msg_s = gettext("Successfully moved %(name)s.");
                                        } else if (success_num == 2) {
                                            msg_s = gettext("Successfully moved %(name)s and 1 other item.");
                                        } else {
                                            msg_s = gettext("Successfully moved %(name)s and %(amount)s other items.");
                                        }
                                    } else { // cp
                                        if (success_num == 1) {
                                            msg_s = gettext("Successfully copied %(name)s.");
                                        } else if (success_num == 2) {
                                            msg_s = gettext("Successfully copied %(name)s and 1 other item.");
                                        } else {
                                            msg_s = gettext("Successfully copied %(name)s and %(amount)s other items.");
                                        }
                                    }
                                    msg_s = msg_s.replace('%(name)s', first_item).replace('%(amount)s', success_num - 1);
                                    setTimeout(function() { Common.feedback(msg_s, 'success'); }, 600);
                                }
                            } else {
                                mvcpDirent(++i);
                            }
                        };
                        var end = function () {
                            setTimeout(function () { $.modal.close(); }, 500);
                            if (op == 'mv') {
                                _this.updateMagnificPopupOptions();
                            }
                        };
                        mvcpDirent();
                        cancel_btn.on('click', function() {
                            Common.disableButton(cancel_btn);
                            var task_id = $(this).data('task_id');
                            $.ajax({
                                url: Common.getUrl({name: 'copy_move_task'}),
                                type: 'DELETE',
                                dataType: 'json',
                                beforeSend: Common.prepareCSRFToken,
                                data: {'task_id': task_id},
                                success: function(data) {
                                    other_info.html(gettext("Canceled.")).removeClass('hide');
                                    cancel_btn.addClass('hide');
                                    end();
                                },
                                error: function(xhr, textStatus, errorThrown) {
                                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                                    other_info.html(error_msg).removeClass('hide');
                                    Common.enableButton(cancel_btn);
                                }
                            });
                        });
                    }
                    return false;
                });
            },

            getMore: function () {
                var $el = this.$('.cur-view-main-con')[0];
                if (this.dir.dirent_more &&
                    $el.scrollTop > 0 &&
                    // scroll to the bottom
                    // '+1': for scrollTop On systems using display scaling
                    $el.clientHeight + $el.scrollTop + 1 >= $el.scrollHeight) {
                    this.render_dirents_slice(this.dir.last_start, this.dir.limit);
                    this.getThumbnail();
                }
            }

      });

      return DirView;
});
