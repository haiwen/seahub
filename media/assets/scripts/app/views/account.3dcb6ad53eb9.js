define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/views/widgets/popover'
], function($, _, Backbone, Common, PopoverView) {
    'use strict';

    var View = PopoverView.extend({
        id: 'user-info-popup',
        className: 'sf-popover account-popup',

        template:  _.template($('#user-info-popup-tmpl').html()),

        initialize: function(options) {
            PopoverView.prototype.initialize.call(this);

            this.render();
            this.$loadingTip = this.$('.loading-tip');
            this.$error = this.$('.error');
            this.$space = this.$('#space-traffic');
            this.$account = $('#account');

            var _this = this;
            $('.account-toggle').on('click', function() {
                _this.toggle();
                return false;
            });
        },

        render: function() {
            this.$el.html(this.template());
            return this;
        },

        showContent: function() {
            var _this = this;

            this.$error.hide();
            this.$loadingTip.show();
            this.$space.addClass('hide');

            $.ajax({
                url: Common.getUrl({'name': 'space_and_traffic'}),
                dataType: 'json',
                cache: false,
                success: function(data) {
                    _this.$loadingTip.hide();
                    _this.$space.html(data['html']).removeClass('hide');
                },
                error: function(xhr, textStatus, errorThrown) {
                    _this.$loadingTip.hide();
                    var error_msg = Common.prepareAjaxErrorMsg(xhr);
                    _this.$error.html(error_msg).show();
                }
            });

            this.$account.append(this.$el);
        }

    });

    return View;
});
