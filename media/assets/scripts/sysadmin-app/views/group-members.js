define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/group-member',
    'sysadmin-app/collection/group-members'
], function($, _, Backbone, Common, GroupMemberView, GroupMemberCollection) {

    'use strict';

    var GroupMembersView = Backbone.View.extend({

        id: 'admin-groups',

        tabNavTemplate: _.template($("#groups-tabnav-tmpl").html()),
        template: _.template($("#group-members-tmpl").html()),
        addMemberFormTemplate: _.template($('#add-group-member-form-tmpl').html()),

        initialize: function() {
            this.groupMemberCollection = new GroupMemberCollection();
            this.listenTo(this.groupMemberCollection, 'add', this.addOne);
            this.listenTo(this.groupMemberCollection, 'reset', this.reset);
        },

        events: {
            'click #js-add-group-member': 'addGroupMember'
        },

        addGroupMember: function () {
            var $form = $(this.addMemberFormTemplate()),
                _this = this;

            $form.modal();
            $('#simplemodal-container').css({'height':'auto', 'width':'auto'});

            $('[name="email"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '275px',
                containerCss: {'margin-bottom': '5px'},
                placeholder: gettext("Search users or enter emails and press Enter")
            }));

            $form.on('submit', function() {
                var group_id = _this.groupMemberCollection.group_id;
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
                        'group_id': group_id
                    }),
                    type: 'POST',
                    dataType: 'json',
                    beforeSend: Common.prepareCSRFToken,
                    traditional: true,
                    data: {'email': emails.split(',')},
                    success: function(data) {
                        if (data.success.length > 0) {
                            _this.groupMemberCollection.add(data.success, {prepend: true});
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

        render: function() {
            var group_id = this.groupMemberCollection.group_id;
            this.$el.html(this.tabNavTemplate({'cur_tab': 'members', 'group_id': group_id}) + this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(group_id) {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }

            // init collection
            this.groupMemberCollection.setGroupId(group_id);
            this.render();
            this.showGroupMembers();
        },

        showGroupMembers: function() {
            this.initPage();
            var _this = this;

            this.groupMemberCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            this.$loadingTip.hide();
            if (this.groupMemberCollection.length > 0) {
                this.groupMemberCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
            this.$('.path-bar').append(this.groupMemberCollection.group_name);
        },

        addOne: function(item, collection, options) {
            var view = new GroupMemberView({model: item});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        }
    });

    return GroupMembersView;

});
