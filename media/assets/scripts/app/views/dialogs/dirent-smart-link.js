define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    var DirentSmartLinkDialog = Backbone.View.extend({
        smartLinkTemplate: _.template($("#smart-link-tmpl").html()),

        initialize: function(options) {
            this.attributes = options.attributes;
            this.dir = options.dir;
            this.render({attributes: this.attributes, dir:this.dir});
            this.$el.modal({autoResize:true, focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
        },

        render: function() {
            var url = Common.getUrl({name: 'smart_link'}) + "?repo_id=" + this.dir.repo_id + "&path=" + encodeURIComponent(this.dir.path + "/" + this.attributes.obj_name) + "&is_dir=" + !this.attributes.is_file;
            var $el = this.$el;
            $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json',
                beforeSend: Common.prepareCSRFToken,
                success: function(data) {
                    $el.find('.smart-link-loading').hide();
                    $el.find('.smart-link-operation').show();
                    $el.find('.smart-link-href').attr("href",data.smart_link).show().html(data.smart_link);
                },
                error: function(xhr) {
                    Common.ajaxErrorHandler(xhr);
                }
            });
            this.$el.html(this.smartLinkTemplate());
            return this;
        },

        events: {
            "click .smart-link-copy": 'smartLinkCopy',
            "click .smart-link-close": 'smartLinkClose'
        },

        smartLinkCopy: function () {
            var $el = this.$el;
            $el.find('.copy-input').val($el.find('.smart-link-href').html()).select();
            document.execCommand('copy');
            Common.feedback(gettext("Internal link copied to clipboard"), 'success');
            $.modal.close();
        },

        smartLinkClose: function () {
            $.modal.close();
        }

    });

    return DirentSmartLinkDialog;
});