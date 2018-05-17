define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/share',
    'app/views/folder-perm',
    'app/views/widgets/hl-item-view',
    'app/views/widgets/dropdown'
], function($, _, Backbone, Common, ShareView, FolderPermView,
    HLItemView, DropdownView) {
    'use strict';

    var GroupRepoView = HLItemView.extend({
        tagName: 'tr',

        template: _.template($('#group-repo-tmpl').html()),
        mobileTemplate: _.template($('#group-repo-mobile-tmpl').html()),
        renameTemplate: _.template($("#repo-rename-form-template").html()),

        events: {
            // for group owned repo
            'click .delete-repo': 'delRepo',
            'click .js-set-repo-perm': 'setRepoPerm',
            'click .js-repo-rename': 'renameRepo',
            'click .js-repo-details': 'viewDetails',
            'click': 'clickItem',

            'click .cancel-share': 'unshare',
            'click .repo-share-btn': 'share'
        },

        initialize: function(options) {
            HLItemView.prototype.initialize.call(this);
            
            this.group_id = options.group_id;
            this.parent_group_id = options.parent_group_id;
            this.is_staff = options.is_staff;
            this.show_repo_owner = options.show_repo_owner;
            this.repoDetailsView = options.repoDetailsView;

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, 'destroy', this.remove);
        },

        delRepo: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'group_owned_repo',
                    'group_id': this.group_id,
                    'repo_id': this.model.get('id')
                }),
                type: 'DELETE',
                cache: false,
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function() {
                    var msg = gettext("Successfully deleted library {placeholder}")
                        .replace('{placeholder}', _this.model.get('name'));
                    _this.remove();
                    Common.feedback(msg, 'success');
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            });
            return false;
        },

        setRepoPerm: function() {
            var options = {
                'obj_name': this.model.get('name'),
                'dir_path': '/',
                'repo_id': this.model.get('id'),
                'is_group_owned_repo': true,
                'group_id': this.group_id
            };
            this._hideMenu();
            new FolderPermView(options);
            return false;
        },

        _hideMenu: function() {
            this.dropdown.hide();
        },

        renameRepo: function() {
            var repo_name = this.model.get('name');

            var form = $(this.renameTemplate({
                repo_name: repo_name
            }));

            var $name_span = this.$('.repo-name-span'),
                $op_td = this.$('.repo-op-td'),
                $name_td = $name_span.closest('td');
            $name_td.attr('colspan', 2).css({
                'width': $name_span.width() + $op_td.outerWidth(),
                'height': $name_span.height()
            }).append(form);
            $op_td.hide();
            $name_span.hide();
            $('[name="newname"]', form).trigger('select');

            this._hideMenu();
            app.ui.freezeItemHightlight = true;

            var cancelRename = function() {
                app.ui.freezeItemHightlight = false;
                form.remove();
                $op_td.show();
                $name_span.show();
                $name_td.attr('colspan', 1).css({
                    'width': $name_span.width()
                });
                return false; // stop bubbling (to 'doc click to hide .hidden-op')
            };
            $('.cancel', form).on('click', cancelRename);
            var form_id = form.attr('id');
            var _this = this;
            form.on('submit', function() {
                var new_name = $.trim($('[name="newname"]', form).val());
                var err_msg;
                if (!new_name) {
                    err_msg = gettext("It is required.");
                    Common.feedback(err_msg, 'error');
                    return false;
                }

                if (new_name.indexOf('/') != -1) {
                    err_msg = gettext("Name should not include '/'.");
                    Common.feedback(err_msg, 'error');
                    return false;
                }

                if (new_name == repo_name) {
                    cancelRename();
                    return false;
                }

                var submit_btn = $('[type="submit"]', form);
                Common.disableButton(submit_btn);
                $.ajax({
                    url: Common.getUrl({
                        'name': 'group_owned_repo',
                        'group_id': _this.group_id,
                        'repo_id': _this.model.get('id')
                    }),
                    type: 'PUT',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    data: {
                        'name': new_name
                    },
                    success: function(data) {
                        app.ui.freezeItemHightlight = false;
                        _this.model.set({'name': data.name}); // it will trigger 'change' event
                    },
                    error: function(xhr) {
                        var err_msg;
                        if (xhr.responseText) {
                            err_msg = JSON.parse(xhr.responseText).error||JSON.parse(xhr.responseText).error_msg;
                        } else {
                            err_msg = gettext("Failed. Please check the network.");
                        }
                        Common.feedback(err_msg, 'error');
                        Common.enableButton(submit_btn);
                    }
                });
                return false;
            });

            return false;
        },

        viewDetails: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var data = $.extend({}, obj, {
                icon_url: this.model.getIconUrl(icon_size),
                big_icon_url: this.model.getIconUrl()
            });
            var detailsView = this.repoDetailsView;
            detailsView.show(data);

            // fetch other data
            $.ajax({
                url: Common.getUrl({
                    'name': 'repo_v2.1',
                    'repo_id': this.model.get('id')
                }),
                cache: false,
                dataType: 'json',
                success: function(data) {
                    detailsView.update({
                        'file_count': data.file_count
                    });
                },
                error: function() {
                    detailsView.update({'error': true});
                }
            });

            this._hideMenu();
            return false;
        },

        clickItem: function(e) {
            var target =  e.target || event.srcElement;
            if (this.parent_group_id != 0 && // only for address book group repo
                this.$('td').is(target) &&
                this.repoDetailsView.$el.is(':visible')) {
                this.viewDetails();
            }
        },

        render: function() {
            var obj = this.model.toJSON();
            var icon_size = Common.isHiDPI() ? 48 : 24;
            var icon_url = this.model.getIconUrl(icon_size);
            var tmpl = $(window).width() >= 768 ? this.template : this.mobileTemplate;
            $.extend(obj, {
                group_id: this.group_id,
                parent_group_id: this.parent_group_id,
                is_staff: this.is_staff,
                // for '#groups' (no 'share_from_me')
                is_repo_owner: app.pageOptions.username == this.model.get('owner'),
                //'owner_nickname' for '#group/id/', 'owner_name' for '#groups'
                owner_name: this.model.get('owner_nickname') || this.model.get('owner_name'),
                show_repo_owner: this.show_repo_owner,
                icon_url: icon_url,
                icon_title: this.model.getIconTitle()
            });
            this.$el.html(tmpl(obj));

            var dropdownOptions = {};
            if ($(window).width() < 768) {
                dropdownOptions = {'right': 0};
            }
            this.dropdown = new DropdownView($.extend({
                el: this.$('.sf-dropdown')
            }, dropdownOptions));

            return this;
        },

        share: function() {
            var options = {
                'is_repo_owner': app.pageOptions.username == this.model.get('owner'),
                'is_virtual': false,
                'user_perm': 'rw',
                'repo_id': this.model.get('id'),
                'repo_encrypted': this.model.get('encrypted'),
                'is_dir': true,
                'dirent_path': '/',
                'obj_name': this.model.get('name')
            };

            if (app.pageOptions.is_pro) {
                options.is_admin = this.model.get('is_admin'); // 'is_admin': repo is shared to the group with 'admin' perm
            }

            new ShareView(options);
            return false;
        },

        unshare: function() {
            var lib_name = this.model.get('name');
            this.model.destroy({
                wait: true,
                success: function() {
                    var msg = gettext('Successfully unshared 1 item.');
                    Common.feedback(msg, 'success', Common.SUCCESS_TIMOUT);
                },
                error: function(model, response) {
                    var err;
                    if (response.responseText) {
                        err = JSON.parse(response.responseText).error_msg;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err, 'error');
                }
            });

            return false;
        }

    });

    return GroupRepoView;
});
