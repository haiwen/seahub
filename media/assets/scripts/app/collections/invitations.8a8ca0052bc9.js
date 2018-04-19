define([
    'underscore',
    'backbone',
    'common',
    'app/models/invitation'
], function(_, Backbone, Common, Invitation) {
    'use strict';

    var Invitations = Backbone.Collection.extend({
        model: Invitation,
        url: function() {
            return Common.getUrl({name: 'invitations'});
        }
    });

    return Invitations;
});
