define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share',
    'app/views/folder-perm'
], function($, _, Backbone, Common, FileTree, ShareView, FolderPermView) {
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
            /*
            if (!$('.grid-hidden-op:visible').length && !$('#grid-rename-form').length) {
                this.$('.grid-img-inner-container').addClass('hl');
            }
            */
        },

        rmHighlight: function() {
            this.$('.img-link').removeClass('hl');
            this.$('.text-link').removeClass('hl');
            /*
            if (!$('.grid-hidden-op:visible').length && !$('#grid-rename-form').length) {
                this.$('.grid-img-inner-container').removeClass('hl');
            }
            */
        },

        showPopupMenu: function(event) {
            console.log("showPopupMenu");
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
            this.$('.grid-item-op').css({
                'left': '100px',
                'top': '100px',
            });

            // TODO: bind operations here

            this.$('.grid-item-op .delete').on('click', { view: this }, this.del);

            return false;
        },

        del: function(event) {
            var _this = event.data.view;
            var dirent_name = _this.model.get('obj_name');
            _this.model.deleteFromServer({
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

    });

    return DirentGridView;
});
