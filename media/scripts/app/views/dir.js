define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/collections/dirents',
    'app/views/dirents',
    'text!' + app.config._tmplRoot + 'dir-op-bar.html',
    'text!' + app.config._tmplRoot + 'path-bar.html',
    ], function($, _, Backbone, Common, FileTree, DirentCollection, DirentView,
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
            },

            showDir: function(repo_id, path) {
                console.log("showDir " + repo_id + " " + path);
                this.repo_id = repo_id;
                this.path = path;
                this.dir.setPath(repo_id, path);
                this.dir.fetch({reset: true});
                this.$el.show();
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
                    obj = {path: path, repo_name: dir.repo_name};

                if (path != '/') {
                    $.extend(obj, {
                       path_list: path.substr(1).split('/'),
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
                    repo_id: dir.repo_id
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
                    var dirent_name = $.trim($('input[name="name"]', form).val()),
                        post_data = {'dirent_name': dirent_name},
                        post_url = Common.getUrl({name: "new_dir", repo_id: dir.repo_id})
                                   + '?parent_dir=' + encodeURIComponent(dir.path);

                    if (!dirent_name) {
                      Common.showFormError(form_id, gettext("It is required."));
                      return false;
                    };

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
                        $('tr:first', dirView.$dirent_list).before(view.render().el); // put the new dir as the first one
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

                form.modal({appendTo:'#main'});
                $('#simplemodal-container').css({'height':'auto'});

                form.find('.set-file-type').on('click', function() {
                    file_name.val('.' + $(this).data('filetype'));
                    Common.setCaretPos(file_name[0], 0);
                    file_name.focus();
                });

                form.submit(function() {
                    var dirent_name = $.trim(file_name.val()),
                        post_data = {'dirent_name': dirent_name},
                        post_url = Common.getUrl({name: "new_file", repo_id: dir.repo_id})
                                   + '?parent_dir=' + encodeURIComponent(dir.path);

                    if (!dirent_name) {
                      Common.showFormError(form_id, gettext("It is required."));
                      return false;
                    };

                    var after_op_success = function(data) {
                        location.href = Common.getUrl({name: "repo_new_file", repo_id: dir.repo_id})
                                        + '?p=' + encodeURIComponent(dir.path) + encodeURIComponent(data['name']);
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

      });

      return DirView;
});
