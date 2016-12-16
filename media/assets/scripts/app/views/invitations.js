define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/invitation',
    'app/collections/invitations'
], function($, _, Backbone, Common, InvitedPeopleView,
    InvitedPeopleCollection) {

    'use strict';

    var InvitationsView = Backbone.View.extend({

        id: 'invitations',

        template: _.template($('#invitations-tmpl').html()),
        inviteFormTemplate: _.template($('#invitation-form-tmpl').html()),

        initialize: function() {
            this.collection = new InvitedPeopleCollection();
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.html(this.template());
            this.$loadingTip = this.$('.loading-tip');
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$emptyTip = this.$('.empty-tips');
            this.$error = this.$('.error');
        },

        events: {
            'click #invite-people': 'invitePeople'
        },

        invitePeople: function() {
            var _this = this;
            var $form = $(this.inviteFormTemplate());
            var form_id = $form.attr('id');

            $form.modal({appendTo:'#main'});
            $('#simplemodal-container').css({'height':'auto'});

            $form.submit(function() {
                var accepter = $.trim($('input[name="accepter"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);
                var $loading = $('.loading-icon', $form);
                if (!accepter) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                };

                $error.hide();
                Common.disableButton($submitBtn);
                $loading.show();
                _this.collection.create({
                    'type': 'guest',
                    'accepter': accepter
                }, {
                    wait: true,
                    prepend: true,
                    success: function() {
                        if (_this.collection.length == 1) {
                            _this.reset();
                        }
                        $.modal.close();
                    },
                    error: function(collection, response, options) {
                        var err_msg;
                        if (response.responseText) {
                            err_msg = response.responseJSON.error_msg||response.responseJSON.detail;
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        $error.html(err_msg).show();
                        Common.enableButton($submitBtn);
                    },
                    complete: function() {
                        $loading.hide();
                    }
                });

                return false;
            });
        },

        addOne: function(item, collection, options) {
            var view = new InvitedPeopleView({model: item});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$emptyTip.hide();
            this.$error.hide();
        },

        reset: function() {
            this.$error.hide();
            if (this.collection.length) {
                this.$tableBody.empty();
                this.collection.each(this.addOne, this);
                this.$emptyTip.hide();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$table.hide();
            }
        },

        show: function() {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showContent();
        },

        showContent: function() {
            var _this = this;

            this.initPage();
            this.collection.fetch({
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
                complete: function() {
                    _this.$loadingTip.hide();
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
