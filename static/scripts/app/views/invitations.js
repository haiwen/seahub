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

        el: '.main-panel',

        template: _.template($('#invitations-tmpl').html()),
        toolbarTemplate: _.template($('#invitations-toolbar-tmpl').html()),
        inviteFormTemplate: _.template($('#invitation-form-tmpl').html()),

        initialize: function() {
            this.collection = new InvitedPeopleCollection();
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.reset);
        },

        renderToolbar: function() {
            this.$toolbar = $('<div class="cur-view-toolbar" id="invitations-toolbar"></div>').html(this.toolbarTemplate());
            this.$('.common-toolbar').before(this.$toolbar);
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main" id="invitations"></div>').html(this.template());
            this.$el.append(this.$mainCon);

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

            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            $form.on('submit', function() {
                var accepters = $.trim($('input[name="accepter"]', $form).val());
                var accepter_list = [];
                var email;

                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);
                var $loading = $('.loading-icon', $form);

                if (!accepters) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                };
                accepters = accepters.split(',');
                for (var i = 0, len = accepters.length; i < len; i++) {
                    email = $.trim(accepters[i]);
                    if (email) {
                        accepter_list.push(email);
                    }
                }
                if (!accepter_list.length) {
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);
                $loading.show();
                $.ajax({
                    url: Common.getUrl({'name': 'invitations_batch'}),
                    type: 'POST',
                    cache: false,
                    data: {
                        'type': 'guest',
                        'accepter': accepter_list
                    },
                    traditional: true,
                    beforeSend: Common.prepareCSRFToken,
                    success: function(data) {
                        var msgs = [];
                        if (data.success.length) {
                            var msg;
                            _this.collection.add(data.success, {prepend: true});
                            if (_this.collection.length == data.success.length) {
                                _this.reset();
                            }
                            if (data.success.length == 1) {
                                msg = gettext('Successfully invited %(email).')
                                    .replace('%(email)', data.success[0].accepter);
                            } else {
                                msg = gettext('Successfully invited %(email) and %(num) other people.')
                                    .replace('%(email)', data.success[0].accepter)
                                    .replace('%(num)', data.success.length - 1);
                            }
                            msgs.push({'msg': msg, 'type': 'success'});
                        }
                        if (data.failed.length) {
                            $(data.failed).each(function(index, item) {
                                var err_msg = item.email + ': ' + item.error_msg;
                                msgs.push({'msg': err_msg, 'type': 'error'});
                            });
                        }
                        if (msgs.length) {
                            Common.feedback(msgs);
                        }
                        $.modal.close();
                    },
                    error: function(xhr) {
                        var error_msg = Common.prepareAjaxErrorMsg(xhr);
                        $error.html(error_msg).show();
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
            this.renderToolbar();
            this.renderMainCon();

            this.showContent();
        },

        showContent: function() {
            var _this = this;

            this.initPage();
            this.collection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        hide: function() {
            this.$toolbar.detach();
            this.$mainCon.detach();
        }

    });

    return InvitationsView;
});
