define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/collections/dirents',
    'app/views/dirent',
    'text!' + app.config._tmplRoot + 'dir-op-bar.html',
    'text!' + app.config._tmplRoot + 'path-bar.html',
    ], function($, simplemodal, _, Backbone, Common, FileTree, DirentCollection, DirentView,
        DirOpBarTemplate, PathBarTemplate) {
        'use strict';

        var DirView = Backbone.View.extend({
            el: $('#dir-view'),
            path_bar_template: _.template(PathBarTemplate),
            dir_op_bar_template: _.template(DirOpBarTemplate),
            newDirTemplate: _.template($("#add-new-dir-form-template").html()),
            newFileTemplate: _.template($("#add-new-file-form-template").html()),

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
                    enable_upload_folder: app.globalState.enable_upload_folder
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
                console.log("sortByTime: " + this.dir.repo_id + " " + this.dir.path);
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
