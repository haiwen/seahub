define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/invitation',
    'app/collections/invitations',
], function($, _, Backbone, Common, InvitedPeopleView,
    InvitedPeopleCollection) {

    'use strict';

    var InvitationsView = Backbone.View.extend({

        id: 'invited_peoples',

        template: _.template($('#invitations-tmpl').html()),
        invitePeopleFormTemplate: _.template($('#invitation-form-tmpl').html()),

        initialize: function() {
            this.invitedPeoples = new InvitedPeopleCollection();
            this.listenTo(this.invitedPeoples, 'reset', this.reset);
            this.render();
        },

        events: {
            'click #invite-people': 'invitePeople'
        },

        invitePeople: function() {
            var form = $(this.invitePeopleFormTemplate()),
                form_id = form.attr('id'),
                _this = this;

            form.modal({appendTo:'#main'});
            $('#simplemodal-container').css({'height':'auto'});

            form.submit(function() {
                var accepter = $.trim($('input[name="accepter"]', form).val());

                if (!accepter) {
                    Common.showFormError(form_id, gettext("It is required."));
                    return false;
                };

                var post_data = {'type': 'guest', 'accepter': accepter},
                    post_url = Common.getUrl({name: "invitations"});

                var after_op_success = function(data) {
                    $.modal.close();
                    var new_people_invited = _this.invitedPeoples.add({
                        'accepter': data['accepter'],
                        'type': data['type'],
                        'accept_time': '',
                        'invite_time': data['invite_time'],
                        'expire_time': data['expire_time']
                    }, {silent:true});

                    var view = new InvitedPeopleView({model: new_people_invited});
                    _this.$tableBody.prepend(view.render().el);
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

        addOne: function(invitedPeople) {
            var view = new InvitedPeopleView({model: invitedPeople});
            this.$tableBody.append(view.render().el);
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        reset: function() {
            this.$tableBody.empty();
            this.$loadingTip.hide();
            this.invitedPeoples.each(this.addOne, this);
            if (this.invitedPeoples.length) {
                this.$emptyTip.hide();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        render: function() {
            this.$el.html(this.template());
            this.$tip = this.$('.tip');
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showInvitedPeoples();
        },

        showInvitedPeoples: function() {
            this.initPage();
            var _this = this;

            this.invitedPeoples.fetch({
                cache: false,
                reset: true,
                error: function (collection, response, opts) {
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

                    Common.feedback(err_msg, 'error');
                }
            });
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        }

    });

    return InvitationsView;
});
