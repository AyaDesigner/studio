define(
    [
        'jquery',
        'backbone',
        'proactive/rest/studio-client',
        'xml2json'
    ],

    function ($, Backbone, StudioClient, xml2json) {

    "use strict";

    var undoStates = [];
    var redoStates = [];
    var enabled = true;
    return {
        getOffsetsFromDOM: function () {
            return _.object(
                _.map($('.task'), function (t) {
                    var $t = $(t)
                    var taskName = $t.find("span.name").text()
                    var offset = $t.offset()
                    return [taskName, offset]
                })
            )
        },

        save: function () {
            if (!enabled) return;

            var StudioApp = require('StudioApp');
            var state = {xml: StudioApp.views.xmlView.generateXml(),
                offsets: this.getOffsetsFromDOM(),
                accordions: StudioApp.views.workflowView.getOpenAccordions(),
                activeTask: StudioApp.views.workflowView.getActiveTask()};
            this._saveIfDifferent(state);
        },
        undo: function () {
            if (undoStates.length <= 1) {
                StudioClient.alert("No further undo data", "");
                return;
            }
            this._move(undoStates, redoStates);
            this._restoreLastState();
        },
        undoIfEnabled: function () {
            if (enabled) {
                this.undo();
            }
        },
        redo: function () {
            if (redoStates.length == 0) {
                StudioClient.alert("No further redo data", "");
                return;
            }
            this._move(redoStates, undoStates)
            this._restoreLastState();
        },
        redoIfEnabled: function () {
            if (enabled) {
                this.redo();
            }
        },
        runWithDisabled: function (runnable) {
            this._disable()
            try {
                runnable()
            } finally {
                this._enable()
                this.save()
            }
        },
        reset: function () {
            undoStates = []
            redoStates = []
            this.save()
        },
        _saveIfDifferent: function (state) {
            var oldState = undoStates[undoStates.length - 1]
            if (JSON.stringify(state) !== JSON.stringify(oldState)) {
                undoStates.push(state)
                redoStates = [];
            }
        },
        _move: function (from, to) {
            var e = from.pop()
            if (e) {
                to.push(e);
            }
        },
        _restoreLastState: function () {
            var state = undoStates[undoStates.length - 1];
            if (state) {
                var StudioApp = require('StudioApp');

                this.runWithDisabled(function () {
                    var json = xml2json.xmlToJson(xml2json.parseXml(state.xml))
                    StudioApp.importNoReset(json);

                    StudioApp.views.workflowView.restoreLayoutFromOffsets(state.offsets)
                    StudioApp.views.workflowView.restoreOpenAccordions(state.accordions)
                    StudioApp.views.workflowView.restoreActiveTask(state.activeTask)
                    StudioApp.views.xmlView.model = StudioApp.views.workflowView.model;
                })
            }
        },
        _disable: function () {
            enabled = false;
        },
        _enable: function () {
            enabled = true;
        }
    }
})
