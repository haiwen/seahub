define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share',
    'app/views/folder-perm',
    'app/views/dialogs/dirent-mvcp',
    'app/views/dialogs/dirent-rename',
], function($, _, Backbone, Common, FileTree, ShareView, FolderPermView,
    DirentMvcpDialog, DirentRenameDialog) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentGridView = Backbone.View.extend({
        tagName: 'li',
        className: 'grid-item',

        dirTemplate: _.template($('#grid-view-dir-item-tmpl').html()),
        dirOpTemplate: _.template($('#grid-view-dir-op-tmpl').html()),
        fileTemplate:  _.template($('#grid-view-file-item-tmpl').html()),
        fileOpTemplate: _.template($('#grid-view-file-op-tmpl').html()),
        renameTemplate: _.template($("#dirent-rename-dialog-template").html()),

        // renameTemplate: _.template($("#grid-rename-form-template").html()),
        // mvcpTemplate: _.template($("#mvcp-form-template").html()),
        // mvProgressTemplate: _.template($("#mv-progress-popup-template").html()),

        initialize: function(options) {
            this.dirView = options.dirView;
            this.dir = this.dirView.dir;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'remove', this.remove); // for multi dirents: delete, mv
        },

        render: function() {
            var dir = this.dir;
            var template;

            if (this.model.get('is_dir')) {
                template = this.dirTemplate;
            } else {
                template = this.fileTemplate;
            }

            this.$el.html(template({
                dirent: this.model.attributes,
                dirent_path: this.model.getPath(),
                icon_url: this.model.getIconUrl(192),
                url: this.model.getWebUrl(),
                category: dir.category,
                repo_id: dir.repo_id,
                is_repo_owner: dir.is_repo_owner,
                can_generate_shared_link: app.pageOptions.can_generate_shared_link,
                is_pro: app.pageOptions.is_pro,
                repo_encrypted: dir.encrypted
            }));

            this.$('.file-locked-icon').attr('title', gettext("locked by {placeholder}").replace('{placeholder}', this.model.get('lock_owner_name')));

            return this;
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            //'mousedown .img-link': 'showPopupMenu',
            //'mousedown .text-link': 'showPopupMenu'
            'contextmenu .img-link': 'showPopupMenu',
            'contextmenu .text-link': 'showPopupMenu'

            /*
            'click .dir-link': 'visitDir',
            'click .share': 'share',
            'click .delete': 'del', // 'delete' is a preserve word
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp',
            'click .set-folder-permission': 'setFolderPerm',
            'click .lock-file': 'lockFile',
            'click .unlock-file': 'unlockFile'
            */
        },

        highlight: function() {
            this.$('.img-link').addClass('hl');
            this.$('.text-link').addClass('hl');
        },

        rmHighlight: function() {
            this.$('.img-link').removeClass('hl');
            this.$('.text-link').removeClass('hl');
        },

        showPopupMenu: function(event) {
            var dir = this.dir;
            var template;

            if (this.model.get('is_dir')) {
                template = this.dirOpTemplate;
            } else {
                template = this.fileOpTemplate;
            }

            this.$('.img-link').addClass('hl');
            this.$('.text-link').addClass('hl');

            var op = template({
                dirent: this.model.attributes,
                dirent_path: this.model.getPath(),
                download_url: this.model.getDownloadUrl(),
                category: dir.category,
                repo_id: dir.repo_id,
                is_repo_owner: dir.is_repo_owner,
                can_generate_shared_link: app.pageOptions.can_generate_shared_link,
                is_pro: app.pageOptions.is_pro,
                repo_encrypted: dir.encrypted
            });
            this.$el.append(op);

            var el_pos = this.$el.offset();
            this.$('.grid-item-op').css({
                'position': 'absolute',
                'left': event.pageX - el_pos.left,
                'top': event.pageY - el_pos.top
            });

            // Using _.bind(function, object) to make that whenever the function is
            // called, the value of this will be the object.
            this.$('.delete').on('click', _.bind(this.del, this));
            this.$('.share').on('click', _.bind(this.share, this));
            this.$('.mv').on('click', _.bind(this.mvcp, this));
            this.$('.cp').on('click', _.bind(this.mvcp, this));
            this.$('.rename').on('click', _.bind(this.rename, this));
            this.$('.open-via-client').on('click', _.bind(this.open_via_client, this));
            this.$('.lock-file').on('click', _.bind(this.lockFile, this));
            this.$('.unlock-file').on('click', _.bind(this.unlockFile, this));
            this.$('.set-folder-permission').on('click', _.bind(this.setFolderPerm, this));

            return false;
        },

        closeMenu: function() {
            this.$('.grid-item-op').remove();
        },

        del: function(event) {
            this.closeMenu();
            var dirent_name = this.model.get('obj_name');
            this.model.deleteFromServer({
                success: function(data) {
                    var msg = gettext("Successfully deleted %(name)s")
                        .replace('%(name)s', Common.HTMLescape(dirent_name));
                    Common.feedback(msg, 'success');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        share: function() {
            var dir = this.dir,
                obj_name = this.model.get('obj_name'),
                dirent_path = this.model.getPath();

            var options = {
                'is_repo_owner': dir.is_repo_owner,
                'is_virtual': dir.is_virtual,
                'user_perm': this.model.get('perm'),
                'repo_id': dir.repo_id,
                'repo_encrypted': false,
                'is_dir': this.model.get('is_dir') ? true : false,
                'dirent_path': dirent_path,
                'obj_name': obj_name
            };
            new ShareView(options);
            this.closeMenu();
            return false;
        },

        mvcp: function(event) {
            var op_type = $(event.target).hasClass('mv') ? 'mv' : 'cp';
            var options = {
                'dir': this.dir,
                'dirent': this.model,
                'op_type': op_type
            };

            new DirentMvcpDialog(options);
            this.closeMenu();
            return false;
        },

        rename: function() {
            this.closeMenu();
            var options = {
                'dir': this.dir,
                'dirent': this.model
            };
            new DirentRenameDialog(options);
            return false;
        },

        setFolderPerm: function() {
            var options = {
                'obj_name': this.model.get('obj_name'),
                'dir_path': this.dir.path,
                'repo_id': this.dir.repo_id
            };
            new FolderPermView(options);
            return false;
        },

        lockFile: function() {
            this.closeMenu();
            this.model.lockFile({
                success: function() {
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        unlockFile: function() {
            this.closeMenu();
            this.model.unlockFile({
                success: function() {
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        open_via_client: function() {
            this.closeMenu();
            return true;
        }

    });

    return DirentGridView;
});
