define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'file-tree',
    'app/views/share',
    'app/views/dialogs/dirent-mvcp',
    'app/views/folder-perm'
], function($, _, Backbone, Common, FileTree, ShareView, DirentMvcpDialog,
    FolderPermView) {
    'use strict';

    app = app || {};
    app.globalState = app.globalState || {};

    var DirentView = Backbone.View.extend({
        tagName: 'tr',

        template: _.template($('#dirent-tmpl').html()),
        renameTemplate: _.template($("#rename-form-template").html()),

        initialize: function(options) {
            this.dirView = options.dirView;
            this.dir = this.dirView.dir;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'remove', this.remove); // for multi dirents: delete, mv
        },

        render: function() {
            var dir = this.dir;
            var dirent_path = Common.pathJoin([dir.path, this.model.get('obj_name')]);
            var is_pro = app.pageOptions.is_pro;
            var file_audit_enabled = app.pageOptions.file_audit_enabled;
            var file_icon_size = Common.isHiDPI() ? 48 : 24;

            this.$el.html(this.template({
                dirent: this.model.attributes,
                dirent_path: dirent_path,
                encoded_path: Common.encodePath(dirent_path),
                icon_url: this.model.getIconUrl(file_icon_size),
                url: this.model.getWebUrl(),
                download_url: this.model.getDownloadUrl(),
                category: dir.category,
                repo_id: dir.repo_id,
                is_repo_owner: dir.is_repo_owner,
                can_generate_shared_link: app.pageOptions.can_generate_shared_link,
                is_pro: is_pro,
                file_audit_enabled: file_audit_enabled,
                repo_encrypted: dir.encrypted
            }));
            this.$('.file-locked-icon').attr('title', gettext("locked by {placeholder}").replace('{placeholder}', this.model.get('lock_owner_name')));

            return this;
        },

        events: {
            'mouseenter': 'highlight',
            'mouseleave': 'rmHighlight',
            'click .select': 'select',
            'click .file-star': 'starFile',
            'click .dir-link': 'visitDir',
            'click .more-op-icon': 'togglePopup',
            'click .share': 'share',
            'click .delete': 'del', // 'delete' is a preserve word
            'click .rename': 'rename',
            'click .mv': 'mvcp',
            'click .cp': 'mvcp',
            'click .set-folder-permission': 'setFolderPerm',
            'click .lock-file': 'lockFile',
            'click .unlock-file': 'unlockFile',
            'click .open-via-client': 'open_via_client'
        },

        _hideMenu: function() {
            this.$el.removeClass('hl').find('.repo-file-op').addClass('vh');
            this.$('.hidden-op').addClass('hide');
        },

        highlight: function() {
            if (!$('.hidden-op:visible').length && !$('#rename-form').length) {
                this.$el.addClass('hl').find('.repo-file-op').removeClass('vh');
            }
        },

        rmHighlight: function() {
            if (!$('.hidden-op:visible').length && !$('#rename-form').length) {
                this.$el.removeClass('hl').find('.repo-file-op').addClass('vh');
            }
        },

        select: function () {
            var checkbox = this.$('.checkbox');
            checkbox.toggleClass('checkbox-checked');
            if (checkbox.hasClass('checkbox-checked')) {
                this.model.set({'selected':true}, {silent:true}); // do not trigger the 'change' event.
            } else {
                this.model.set({'selected':false}, {silent:true});
            }

            var dirView = this.dirView;
            var $dirents_op = dirView.$('#multi-dirents-op');
            var toggle_all_checkbox = dirView.$('th .checkbox');
            var checked_num = dirView.$('tr:gt(0) .checkbox-checked').length;
            if (checked_num > 0) {
                $dirents_op.css({'display':'inline'});
            } else {
                $dirents_op.hide();
            }
            if (checked_num == dirView.$('tr:gt(0)').length) {
                toggle_all_checkbox.addClass('checkbox-checked');
            } else {
                toggle_all_checkbox.removeClass('checkbox-checked');
            }
        },

        starFile: function() {
            var _this = this;
            var dir = this.dirView.dir;
            var starred = this.model.get('starred');
            var options = { repo_id: dir.repo_id };
            options.name = starred ? 'unstar_file' : 'star_file';
            var filePath = Common.pathJoin([dir.path, this.model.get('obj_name')]);
            var url = Common.getUrl(options) + '?file=' + encodeURIComponent(filePath);
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function () {
                    if (starred) {
                        _this.model.set({'starred':false});
                    } else {
                        _this.model.set({'starred':true});
                    }
                },
                error: function (xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
        },

        visitDir: function () { // todo
            // show 'loading'
            this.$('.dirent-icon img').attr({
                'src': app.config.mediaUrl + 'img/loading-icon.gif',
                'alt':''
            });
            // empty all models
            this.dirView.dir.reset();
            // update url & dirents
            var dir_url = this.$('.dir-link').attr("href");
            app.router.navigate(dir_url, {trigger: true}); // offer an url fragment
            return false;
        },

        togglePopup: function() {
            var icon = this.$('.more-op-icon'),
                popup = this.$('.hidden-op');

            if (popup.hasClass('hide')) { // the popup is not shown
                popup.css({'left': icon.position().left});
                if (icon.offset().top + popup.height() <= $('#main').offset().top + $('#main').height()) {
                    // below the icon
                    popup.css('top', icon.position().top + icon.outerHeight(true) + 3);
                } else {
                    popup.css('bottom', icon.parent().outerHeight() - icon.position().top + 3);
                }
                popup.removeClass('hide');
            } else {
                popup.addClass('hide');
            }
        },

        share: function() {
            var dir = this.dir,
                obj_name = this.model.get('obj_name'),
                dirent_path = Common.pathJoin([dir.path, obj_name]);

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
            return false;
        },

        del: function() {
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

        rename: function() {
            var is_dir = this.model.get('is_dir');
            var dirent_name = this.model.get('obj_name');

            var form = $(this.renameTemplate({
                dirent_name: dirent_name
            }));

            var $name = this.$('.dirent-name'),
                $op = this.$('.dirent-op'),
                $td = $name.closest('td');
            $td.attr('colspan', 2).css({
                'width': $name.width() + $op.outerWidth(),
                'height': $name.height()
            }).append(form);
            $op.hide();
            $name.hide();

            this.$('.hidden-op').addClass('hide');

            var cancelRename = function() {
                form.remove();
                $op.show();
                $name.show();
                $td.attr('colspan', 1).css({
                    'width': $name.width()
                });
                return false; // stop bubbling (to 'doc click to hide .hidden-op')
            };
            $('.cancel', form).click(cancelRename);

            var _this = this;
            form.submit(function() {
                var new_name = $.trim($('[name="newname"]', form).val());
                if (!new_name) {
                    return false;
                }
                if (new_name == dirent_name) {
                    cancelRename();
                    return false;
                }

                var submit_btn = $('[type="submit"]', form);
                Common.disableButton(submit_btn);

                var after_op_error = function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        err_msg = $.parseJSON(xhr.responseText).error;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err_msg, 'error');
                    Common.enableButton(submit_btn);
                };
                _this.model.rename({
                    newname: new_name,
                    error: after_op_error
                });
                return false;
            });
            return false;
        },

        mvcp: function(e) {
            var op_type = $(e.currentTarget).hasClass('mv') ? 'mv' : 'cp';
            var options = {
                'dir': this.dir,
                'dirent': this.model,
                'op_type': op_type
            };

            new DirentMvcpDialog(options);
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
            var _this = this;
            this.model.lockFile({
                success: function() {
                    _this.$el.removeClass('hl');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        unlockFile: function() {
            var _this = this;
            this.model.unlockFile({
                success: function() {
                    _this.$el.removeClass('hl');
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            return false;
        },

        open_via_client: function() {
            this._hideMenu();
            return true;
        }

    });

    return DirentView;
});
