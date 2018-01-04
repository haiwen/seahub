define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/address-book-group-item',
    'sysadmin-app/views/group-member',
    'sysadmin-app/collection/address-book-group'
], function($, _, Backbone, Common, GroupItemView, MemberItemView, GroupCollection) {
    'use strict';

    var view = Backbone.View.extend({

        id: 'address-book-group',

        template: _.template($("#address-book-group-tmpl").html()),
        pathTemplate: _.template($("#address-book-group-path-tmpl").html()),
        groupAddFormTemplate: _.template($("#group-add-form-tmpl").html()),
        addMemberFormTemplate: _.template($('#add-group-member-form-tmpl').html()),

        initialize: function() {
            this.groupCollection = new GroupCollection();
            this.listenTo(this.groupCollection, 'add', this.addOne);
            this.listenTo(this.groupCollection, 'reset', this.reset);

            // members
            this.memberCollection = new Backbone.Collection();
            this.listenTo(this.memberCollection, 'add', this.addMember);

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

            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
        },

        events: {
            'click .js-add-group': 'addGroup',
            'click .js-add-member': 'newMember'
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

            this.$error.hide();
        },

        addGroup: function() {
            var _this = this;

            var $form = $(this.groupAddFormTemplate());
            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            $('[name="group_owner"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '268px',
                containerCss: {'margin-bottom': '5px'},
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email and press Enter"), // to override 'placeholder' returned by `Common.conta...`
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }));

            $form.submit(function() {
                var group_name = $.trim($('[name="group_name"]', $form).val());
                var group_owner = $.trim($('[name="group_owner"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!group_name) {
                    $error.html(gettext("Name is required.")).show();
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);

                $.ajax({
                    url: Common.getUrl({
                        'name': 'admin-address-book-groups'
                    }),
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
                        var err_msg;
                        if (xhr.responseText) {
                            err_msg = xhr.responseJSON.error_msg;
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        $error.html(err_msg).show();
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

                $error.hide();
                Common.disableButton($submitBtn);

                $.ajax({
                    url: Common.getUrl({
                        'name': 'admin-group-members',
                        'group_id': _this.options.group_id
                    }),
                    type: 'POST',
                    dataType: 'json',
                    data: {'email': emails.split(',')},
                    traditional: true,
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        if (data.success.length > 0) {
                            _this.memberCollection.add(data.success, {prepend: true});
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
                    error: function(jqXHR, textStatus, errorThrown){
                        var err_msg;
                        if (jqXHR.responseText) {
                            err_msg = jqXHR.responseJSON.error_msg;
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        $error.html(err_msg).show();
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
                error: function(collection, response, opts) {
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    _this.$error.html(err_msg).show();
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
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

            // There is at least 1 member, the owner.
            this.memberCollection.reset(this.groupCollection.data.members);
            this.memberCollection.each(this.addMember, this);
            this.$membersTable.show();
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
