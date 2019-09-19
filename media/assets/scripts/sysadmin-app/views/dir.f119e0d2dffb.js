define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/fileupload',
    'sysadmin-app/views/dirent',
    'sysadmin-app/collection/dirents'
], function($, _, Backbone, Common, FileUploadView,
    DirentView, DirentCollection) {
    'use strict';

    var LibraryDirView = Backbone.View.extend({

        id: 'dir-view',

        template: _.template($('#dir-view-tmpl').html()),
        pathBarTemplate: _.template($('#dir-path-bar-tmpl').html()),
        dir_op_bar_template: _.template($('#dir-op-bar-tmpl').html()),

        newDirTemplate: _.template($("#add-new-dir-form-template").html()),

        initialize: function() {
            this.dir = new DirentCollection();
            this.listenTo(this.dir, 'add', this.addOne);
            this.listenTo(this.dir, 'reset', this.reset);

            this.fileUploadView = new FileUploadView({dirView: this});

            this.render();
        },

        render: function() {
            this.$el.html(this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            //this.$emptyTip = this.$('.empty-tips');
            this.$path_bar = this.$('.path-bar');
            this.$dir_op_bar = this.$('.repo-op');
        },

        events: {
            'click .basic-upload-btn': 'uploadFile',
            'click #add-new-dir': 'newDir'
        },

        uploadFile: function() {
            this.$('#basic-upload-input').trigger('click');
        },

        addNewFile: function(new_dirent) {
            new_dirent.set('last_update', new Date().getTime());
            var view = new DirentView({model: new_dirent, dirView: this});
            var new_file = view.render().el;
            if ($('tr', this.$tableBody).length == 0) {
                this.$tableBody.append(new_file);
            } else {
                var dirs = this.dir.where({'is_file':false});
                if (dirs.length == 0) {
                    this.$tableBody.prepend(new_file);
                } else {
                    // put the new file after the last dir
                    $($('tr', this.$tableBody)[dirs.length - 1]).after(new_file);
                }
            }
        },

        newDir: function() {
            var form = $(this.newDirTemplate()),
                form_id = form.attr('id'),
                dir = this.dir,
                dirView = this;

            form.modal({appendTo:'#main'});
            $('#simplemodal-container').css({'height':'auto'});

            form.on('submit', function() {
                var obj_name = $.trim($('input[name="name"]', form).val());
                if (!obj_name) {
                    Common.showFormError(form_id, gettext("It is required."));
                    return false;
                };

                var post_data = {'obj_name': obj_name},
                    post_url = Common.getUrl({name: 'admin-library-dirents', repo_id: dir.repo_id}) + '?parent_dir=' + Common.encodePath(dir.path);

                var after_op_success = function(data) {
                    var new_dirent = dir.add(data, {silent:true});
                    $.modal.close();
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

        addNewDir: function(new_dirent) {
            var dirView = this;
            var view = new DirentView({model: new_dirent, dirView: dirView});
            dirView.$tableBody.prepend(view.render().el);
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;

            this.fileUploadView.closePopup();
        },

        show: function(repo_id, path) {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }

            // init collection
            this.dir.setPath(repo_id, path);
            this.fetchLibraryDirents();
        },

        initPage: function() {
            this.renderPath();
            this.renderDirOpBar();
            this.setFileInput();

            this.$tableBody.empty();
            this.$loadingTip.show();
            //this.$emptyTip.hide();
        },

        renderPath: function() {
            var dir = this.dir;
            var path = dir.path;
            var obj = {
                path: path,
                repo_name: dir.repo_name,
                is_system_library: dir.is_system_library
            };

            var path_list = path.substr(1).split('/');
            var path_list_encoded = Common.encodePath(path.substr(1)).split('/');
            if (path != '/') {
                $.extend(obj, {
                   path_list: path_list,
                   path_list_encoded: path_list_encoded,
                   repo_id: dir.repo_id
                });
            }

            this.$path_bar.html(this.pathBarTemplate(obj));
        },

        renderDirOpBar: function() {
            // only system lib has 'dir op'(upload file, add dir)
            if (this.dir.is_system_library) {
                this.$dir_op_bar.html(this.dir_op_bar_template()).show();
            } else {
                this.$dir_op_bar.empty().hide();
            }
        },

        setFileInput: function () {
            var $popup = this.fileUploadView.$el;
            $popup.fileupload(
                'option',
                'fileInput',
                this.$('#basic-upload-input'));
        },

        fetchLibraryDirents: function() {
            var dir = this.dir;
            dir.fetch({
                data: {'parent_dir': dir.path},
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            this.initPage();

            this.$loadingTip.hide();

            var length = this.dir.length;
            if (length > 0) {
                this.dir.each(this.addOne, this);
                this.$table.show();
            } else {
                //this.$emptyTip.show();
            }
        },

        addOne: function(dirent) {
            var view = new DirentView({model: dirent, dirView: this});
            this.$tableBody.append(view.render().el);
        }
    });

    return LibraryDirView;

});
