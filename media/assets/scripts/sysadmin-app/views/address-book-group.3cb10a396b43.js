define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'select2',
    'sysadmin-app/views/address-book-group-item',
    'sysadmin-app/views/group-member',
    'sysadmin-app/views/address-book-group-library',
    'sysadmin-app/collection/address-book-group',
    'sysadmin-app/collection/group-repos'
], function($, _, Backbone, Common, Select2,
    GroupItemView, MemberItemView, LibItemView,
    GroupCollection, GroupRepoCollection) {
    'use strict';

    var view = Backbone.View.extend({

        id: 'address-book-group',

        template: _.template($("#address-book-group-tmpl").html()),
        pathTemplate: _.template($("#address-book-group-path-tmpl").html()),
        groupAddFormTemplate: _.template($("#address-book-group-add-form-tmpl").html()),
        addMemberFormTemplate: _.template($('#add-group-member-form-tmpl').html()),
        addLibFormTemplate: _.template($("#address-book-library-add-form-tmpl").html()),

        initialize: function() {
            this.groupCollection = new GroupCollection();
            this.listenTo(this.groupCollection, 'add', this.addOne);
            this.listenTo(this.groupCollection, 'reset', this.reset);

            // members
            this.memberCollection = new Backbone.Collection();
            this.listenTo(this.memberCollection, 'add', this.addMember);

            // libraries
            this.groupRepoCollection = new GroupRepoCollection();
            this.listenTo(this.groupRepoCollection, 'reset', this.resetLibraries);
            this.listenTo(this.groupRepoCollection, 'add', this.addLibrary);

            this.render();
        },

        render: function() {
            this.$el.append(this.template());

            this.$path = this.$('.group-path');

            this.$groups = this.$('.groups');
            this.$groupsTable = $('table', this.$groups);
            this.$groupsTableBody = $('tbody', this.$groupsTable);
            this.$groupsEmptyTip = $('.empty-tip', this.$groups);

            this.$members = this.$('.members');
            this.$membersTable = $('table', this.$members);
            this.$membersTableBody = $('tbody', this.$membersTable);
            this.$membersEmptyTip = $('.empty-tip', this.$members);

            this.$libs = this.$('.libraries');
            this.$libsTable = $('table', this.$libs);
            this.$libsTableBody = $('tbody', this.$libsTable);
            this.$libsEmptyTip = $('.empty-tip', this.$libs);

            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
        },

        events: {
            'click .js-add-group': 'addGroup',
            'click .js-add-member': 'newMember',
            'click .js-add-library': 'newLibrary'
        },

        initPage: function() {
            this.$loadingTip.show();

            this.$path.empty();

            this.$groups.hide();
            this.$groupsTable.hide();
            this.$groupsTableBody.empty();
            this.$groupsEmptyTip.hide();

            this.$members.hide();
            this.$membersTable.hide();
            this.$membersTableBody.empty();
            this.$membersEmptyTip.hide();

            this.$libs.hide();
            this.$libsTable.hide();
            this.$libsTableBody.empty();
            this.$libsEmptyTip.hide();

            this.$error.hide();
        },

        addGroup: function() {
            var _this = this;

            var $form = $(this.groupAddFormTemplate({
                'title': gettext("New Sub-department")
            }));
            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            $form.submit(function() {
                var group_name = $.trim($('[name="group_name"]', $form).val());
                var group_owner = 'system admin';
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);


                if (!group_name) {
                    $error.html(gettext("Name is required.")).show();
                    return false;
                }

                var url_options;
                if (app.pageOptions.org_id) { // org admin
                    url_options = {
                        name: 'org-admin-address-book-groups',
                        org_id: app.pageOptions.org_id
                    };
                } else {
                    url_options = {
                        name: 'admin-address-book-groups'
                    };
                }

                $error.hide();
                Common.disableButton($submitBtn);
                $.ajax({
                    url: Common.getUrl(url_options),
                    type: 'POST',
                    cache: false,
                    data: {
                        'parent_group': _this.groupCollection.data.id,
                        'group_name': group_name,
                        'group_owner': group_owner
                    },
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        _this.groupCollection.add(data, {prepend: true});
                        if (_this.groupCollection.length == 1) {
                            _this.$groupsEmptyTip.hide();
                            _this.$groupsTable.show();
                        }
                        Common.closeModal();
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $error.html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
            return false;
        },

        newMember: function() {
            var _this = this;

            var $form = $(this.addMemberFormTemplate());
            $form.modal();
            $('#simplemodal-container').css({'height':'auto', 'width':'auto'});

            $('[name="email"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '275px',
                containerCss: {'margin-bottom': '5px'},
                placeholder: gettext("Search users or enter emails and press Enter")
            }));

            $form.submit(function() {
                var emails = $.trim($('[name="email"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!emails) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                }

                var url_options;
                if (app.pageOptions.org_id) { // org admin
                    url_options = {
                        name: 'org-admin-group-members',
                        org_id: app.pageOptions.org_id,
                        group_id: _this.options.group_id
                    };
                } else {
                    url_options = {
                        name: 'admin-group-members',
                        group_id: _this.options.group_id
                    };
                }

                $error.hide();
                Common.disableButton($submitBtn);

                $.ajax({
                    url: Common.getUrl(url_options),
                    type: 'POST',
                    dataType: 'json',
                    data: {'email': emails.split(',')},
                    traditional: true,
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        if (data.success.length > 0) {
                            _this.memberCollection.add(data.success, {prepend: true});
                            _this.$membersEmptyTip.hide();
                            _this.$membersTable.show();
                        }

                        var err_str = '';
                        if (data.failed.length > 0) {
                            $(data.failed).each(function(index, item) {
                                err_str += Common.HTMLescape(item.email) + ': ' + Common.HTMLescape(item.error_msg) + '<br />';
                            });
                            $error.html(err_str).show();
                            Common.enableButton($submitBtn);
                        } else {
                            Common.closeModal();
                        }

                    },
                    error: function(xhr, textStatus, errorThrown){
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $error.html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
            return false;
        },

        newLibrary: function() {
            var _this = this;

            var $form = $(this.addLibFormTemplate());
            $form.modal();
            $('#simplemodal-container').css({'height':'auto', 'width':'auto'});

            $form.submit(function() {
                var name = $.trim($('[name="library_name"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!name) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);

                var url_options = { 
                    group_id: _this.options.group_id
                };
                if (app.pageOptions.org_id) { // org admin
                    $.extend(url_options, {
                        name: 'org-admin-group-owned-libraries',
                        org_id: app.pageOptions.org_id
                    });
                } else {
                    $.extend(url_options, {
                        name: 'admin-group-owned-libraries'
                    });
                }

                $.ajax({
                    url: Common.getUrl(url_options),
                    type: 'POST',
                    dataType: 'json',
                    data: {'repo_name': name},
                    traditional: true,
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        _this.groupRepoCollection.add(data, {prepend: true});
                        if (_this.groupRepoCollection.length == 1) {
                            _this.$libsEmptyTip.hide();
                            _this.$libsTable.show();
                        }
                        Common.closeModal();
                    },
                    error: function(xhr, textStatus, errorThrown){
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $error.html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });
                return false;
            });
            return false;
		},

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(options) {
            this.options = options;
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent();
        },

        getContent: function() {
            this.initPage();
            var _this = this;
            this.groupCollection.setOptions(this.options);
            this.groupCollection.fetch({
                data: {'return_ancestors': true},
                cache: false,
                reset: true,
                success: function() {
                    _this.getLibs();
                },
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        getLibs: function() {
            var _this = this;
            this.groupRepoCollection.setGroupId(this.options.group_id);
            this.groupRepoCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                }
            });
        },

        resetLibraries: function() {
            if (this.groupRepoCollection.length > 0) {
                this.groupRepoCollection.each(this.addLibrary, this);
                this.$libsTable.show();
            } else {
                this.$libsEmptyTip.show();
            }
            this.$libs.show();
        },

        addLibrary: function(item, collection, options) {
            var view = new LibItemView({
                model: item,
                group_id: this.options.group_id
            });
            if (options.prepend) {
                this.$libsTableBody.prepend(view.render().el);
            } else {
                this.$libsTableBody.append(view.render().el);
            }
        },

        renderPath: function() {
            this.$path.html(this.pathTemplate({
                ancestor_groups: this.groupCollection.data.ancestor_groups,
                name: this.groupCollection.data.name
            }));
        },

        reset: function() {
            this.initPage();
            this.$loadingTip.hide();
            this.renderPath();

            if (this.groupCollection.length > 0) {
                this.groupCollection.each(this.addOne, this);
                this.$groupsTable.show();
            } else {
                this.$groupsEmptyTip.show();
            }
            this.$groups.show();

            this.memberCollection.reset(this.groupCollection.data.members);
            if (this.memberCollection.length > 0) {
                this.memberCollection.each(this.addMember, this);
                this.$membersTable.show();
            } else {
                this.$membersEmptyTip.show();
            }
            this.$members.show();
        },

        addMember: function(item, collection, options) {
            var view = new MemberItemView({model: item});
            if (options.prepend) {
                this.$membersTableBody.prepend(view.render().el);
            } else {
                this.$membersTableBody.append(view.render().el);
            }
        },

        addOne: function(item, collection, options) {
            var view = new GroupItemView({model: item});
            if (options.prepend) {
                this.$groupsTableBody.prepend(view.render().el);
            } else {
                this.$groupsTableBody.append(view.render().el);
            }
        }
    });

    return view;

});
