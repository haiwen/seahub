define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share',
    'app/views/folder-perm',
    'app/views/dialogs/dirent-mvcp',
    'app/views/dialogs/dirent-rename'
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

        initialize: function(options) {
            this.dirView = options.dirView;
            this.dir = this.dirView.dir;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'remove', this.remove); // for multi dirents: delete, mv
        },

        render: function() {
            var dir = this.dir;
            var dirent_path = this.model.getPath();

            var template;
            if (this.model.get('is_dir')) {
                template = this.dirTemplate;
            } else {
                template = this.fileTemplate;
            }

            this.$el.html(template({
                dirent: this.model.attributes,
                dirent_path: dirent_path,
                icon_url: this.model.getIconUrl(192),
                url: this.model.getWebUrl(),
                category: dir.category,
                repo_id: dir.repo_id,
                is_repo_owner: dir.is_repo_owner,
                is_pro: app.pageOptions.is_pro,
                repo_encrypted: dir.encrypted
            }));

            this.$('.file-locked-icon').attr('title', gettext("locked by {placeholder}").replace('{placeholder}', this.model.get('lock_owner_name')));

            this.$el.attr('title', this.model.get('obj_name'));

            // for image files
            if (this.model.get('is_img')) {
                // use specific links such as .img-link, .text-link, in order to make 'open by index' work
                this.$('.img-link, .text-link').magnificPopup(this.dirView.magnificPopupOptions);
                this.$el.addClass('img-grid-item');
            }

            return this;
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click': 'closeMenu',
            'click .img-link': 'viewImageWithPopup',
            'click .text-link': 'viewImageWithPopup',
            'contextmenu': 'showPopupMenu'
        },

        highlight: function() {
            this.$('.img-link').addClass('hl');
            this.$('.text-link').addClass('hl');
        },

        rmHighlight: function() {
            this.$('.img-link').removeClass('hl');
            this.$('.text-link').removeClass('hl');
        },

        showPopupMenu: function(e) {
            // make sure there is only 1 menu popup
            $('.grid-item-op', this.dirView.$dirent_grid).remove();

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
                can_generate_share_link: app.pageOptions.can_generate_share_link,
                can_generate_upload_link: app.pageOptions.can_generate_upload_link,
                is_pro: app.pageOptions.is_pro,
                file_audit_enabled: app.pageOptions.file_audit_enabled,
                repo_encrypted: dir.encrypted
            });
            this.$el.append(op);

            var el_pos = this.$el.offset();
            this.$('.grid-item-op').css({
                'position': 'absolute',
                'left': e.pageX - el_pos.left,
                'top': e.pageY - el_pos.top
            });

            // Using _.bind(function, object) to make that whenever the function is
            // called, the value of this will be the object.
            this.$('.download-dir').on('click', _.bind(this.download, this));
            this.$('.delete').on('click', _.bind(this.del, this));
            this.$('.share').on('click', _.bind(this.share, this));
            this.$('.mv').on('click', _.bind(this.mvcp, this));
            this.$('.cp').on('click', _.bind(this.mvcp, this));
            this.$('.rename').on('click', _.bind(this.rename, this));
            this.$('.open-via-client').on('click', _.bind(this.open_via_client, this));
            this.$('.lock-file').on('click', _.bind(this.lockFile, this));
            this.$('.unlock-file').on('click', _.bind(this.unlockFile, this));
            this.$('.view-details').on('click', _.bind(this.viewDetails, this));
            this.$('.file-comment').on('click', _.bind(this.viewFileComments, this));
            this.$('.set-folder-permission').on('click', _.bind(this.setFolderPerm, this));

            return false;
        },

        viewImageWithPopup: function() {
            if (this.model.get('is_img')) {
                var index = $('.img-grid-item', this.dirView.$dirent_grid).index(this.$el);
                $.magnificPopup.open(this.dirView.magnificPopupOptions, index); // open by index
            }
        },

        closeMenu: function() {
            this.$('.grid-item-op').remove();
        },

        download: function() {
            this.closeMenu();
            var dir = this.dir;
            var obj_name = this.model.get('obj_name');
            Common.zipDownload(dir.repo_id, dir.path, obj_name);
            return false;
        },

        del: function() {
            var _this = this;
            if (this.model.get('is_img')) {
                var index = $('.img-grid-item', this.dirView.$dirent_grid).index(this.$el);
            }

            this.closeMenu();
            var dirent_name = this.model.get('obj_name');
            this.model.deleteFromServer({
                success: function(data) {
                    var msg = gettext("Successfully deleted %(name)s")
                        .replace('%(name)s', dirent_name);
                    Common.feedback(msg, 'success');

                    if (_this.model.get('is_img')) {
                        _this.dirView.updateMagnificPopupOptions({'op':'delete-item', 'index':index});
                    }
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
            if (app.pageOptions.is_pro) {
                options.is_admin = dir.is_admin;
            }

            new ShareView(options);
            this.closeMenu();
            return false;
        },

        mvcp: function(e) {
            var op_type = $(e.currentTarget).hasClass('mv') ? 'mv' : 'cp';
            var options = {
                'dir': this.dir,
                'dirent': this.model,
                'op_type': op_type
            };

            if (this.model.get('is_img') && op_type == 'mv') {
                var index = $('.img-grid-item', this.dirView.$dirent_grid).index(this.$el);
                $.extend(options, {
                    'dirView': this.dirView,
                    'imgIndex': index
                });
            }

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

            if (this.model.get('is_img')) {
                var index = $('.img-grid-item', this.dirView.$dirent_grid).index(this.$el);
                $.extend(options, {
                    'dirView': this.dirView,
                    'imgIndex': index
                });
            }
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

        viewDetails: function() {
            var _this = this;

            var file_icon_size = Common.isHiDPI() ? 48 : 24;
            var data = {
                repo_id: this.dir.repo_id,
                dir_path: this.dir.path,
                icon_url: this.model.getIconUrl(file_icon_size),
                big_icon_url: this.model.getIconUrl(192),
                dirent: this.model.attributes,
                thumbnail_url: '',
                path: this.dir.repo_name + this.dir.path
            };
            if (app.pageOptions.enable_thumbnail &&
                !this.dir.encrypted &&
                (this.model.get('is_img') || this.model.get('is_video'))) {
                data.thumbnail_url = Common.getUrl({
                    'name': 'thumbnail_get',
                    'repo_id': this.dir.repo_id,
                    'path': Common.encodePath(Common.pathJoin([this.dir.path, this.model.get('obj_name')])),
                    'size': 1024
                });
            }

            var detailsView = this.dirView.direntDetailsView;
            detailsView.show(data);

            if (this.model.get('perm') == 'rw') {
                this.getTags = function() {
                    $.ajax({
                        url: Common.getUrl({
                            'name': 'tags',
                            'repo_id': this.dir.repo_id
                        }),
                        cache: false,
                        data: {
                            'path': Common.pathJoin([this.dir.path, this.model.get('obj_name')]),
                            'is_dir': this.model.get('is_dir') ? true : false
                        },
                        dataType: 'json',
                        success: function(data) {
                            detailsView.updateTags(data);
                        },
                        error: function(xhr) {
                            var error_msg;
                            if (xhr.responseText) {
                                var parsed_resp = $.parseJSON(xhr.responseText);
                                error_msg = parsed_resp.error_msg || parsed_resp.detail;
                            } else {
                                error_msg = gettext("Failed. Please check the network.");
                            }
                            detailsView.updateTags({'error_msg': error_msg});
                        }
                    });
                };

                if (this.model.get('is_file')) {
                    this.getTags();
                }
            }

            // fetch other data for dir
            if (this.model.get('is_dir')) {
                $.ajax({
                    url: Common.getUrl({
                        'name': 'dir-details',
                        'repo_id': this.dir.repo_id
                    }),
                    cache: false,
                    data: {
                        'path': Common.pathJoin([this.dir.path, this.model.get('obj_name')])
                    },
                    dataType: 'json',
                    success: function(data) {
                        detailsView.update({
                            'dir_count': data.dir_count,
                            'file_count': data.file_count,
                            'size': Common.fileSizeFormat(data.size, 1)
                        });

                        if (_this.model.get('perm') == 'rw') {
                            _this.getTags();
                        }
                    },
                    error: function(xhr) {
                        var error_msg;
                        if (xhr.responseText) {
                            var parsed_resp = $.parseJSON(xhr.responseText);
                            error_msg = parsed_resp.error_msg || parsed_resp.detail;
                        } else {
                            error_msg = gettext("Failed. Please check the network.");
                        }
                        detailsView.update({'error_msg': error_msg});
                    }
                });
            }

            this.closeMenu();
            return false;
        },

        viewFileComments: function() {
            var file_icon_size = Common.isHiDPI() ? 48 : 24;
            this.dirView.fileCommentsView.show({
                'is_repo_owner': this.dir.is_repo_owner,
                'repo_id': this.dir.repo_id,
                'path': Common.pathJoin([this.dir.path, this.model.get('obj_name')]),
                'icon_url': this.model.getIconUrl(file_icon_size),
                'file_name': this.model.get('obj_name')
            });

            this.closeMenu();
            return false;
        },

        open_via_client: function() {
            this.closeMenu();
            return true;
        }

    });

    return DirentGridView;
});
