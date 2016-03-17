/**
 * Copyright (c) 2014 Baidu.com, Inc. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * @file sdk/vod_client.spec.js
 * @author zhouhua
 */

var path = require('path');
var fs = require('fs');

var Q = require('q');
var u = require('underscore');
var debug = require('debug')('vod_client.spec');

var config = require('../config');
var VodClient = require('../../').VodClient;
var helper = require('./helper');
//var bosConfig = {
//    credentials: {
//        ak: '3e50573ecad74f1e8032b1c8a1c43265',
//        sk: '3c81cdfbf6d34a6d8c5ec520ca77beba'
//    },
//    endpoint: 'http://bos.bj.baidubce.com'
//};
//var vodConfig = {
//    credentials: {
//        ak: '3e50573ecad74f1e8032b1c8a1c43265',
//        sk: '3c81cdfbf6d34a6d8c5ec520ca77beba'
//    },
//    endpoint: 'http://vod.baidubce.com'
//};
//config.media = vodConfig;
//config.media_bos = bosConfig;

var MediaStatus = {
    PUBLISHED: 'PUBLISHED',
    FAILED: 'FAILED',
    RUNNING: 'RUNNING',
    DISABLED: 'DISABLED',
    BANNED: 'BANNED'
};
var CodeType = [
    'html',
    'flash',
    'url'
];

describe('VodClient', function () {
    var fail;
    var mediaId;
    var title = 'testTitle' + (+new Date());
    var description = 'testDescription' + (+new Date());

    beforeEach(function (done) {
        fail = helper.fail(this);
        done();
    });

    afterEach(function (done) {
        done();
    });

    it('Create Media Source', function (done) {
        var vod = new VodClient(config.media, config.media_bos);
        var filePath = path.join(__dirname, '123.mp3');
        vod.createMediaResource(title, description, filePath)
            .then(function (response) {
                mediaId = response.body.mediaId;
                expect(mediaId).not.toBeUndefined();
            })
            .catch(fail)
            .fin(function () {
                // wait two minuets for encoding media
                setTimeout(done, 120000);
            });
    }, 150000);
    it('Get Media Source', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.getMediaResource(mediaId)
            .then(function (response) {
                expect(response.body.mediaId).toEqual(mediaId);
                expect(response.body.attributes.title).toEqual(title);
                expect(response.body.attributes.description).toEqual(description);
            })
            .catch(fail)
            .fin(done);
    });
    it('Get All Media Sources', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.listMediaResource()
            .then(function (response) {
                var uploadMedia = u.filter(response.body.media, function (media) {
                    return media.mediaId === mediaId;
                });
                expect(uploadMedia.length).toEqual(1);
                expect(uploadMedia[0].attributes.title).toEqual(title);
                expect(uploadMedia[0].attributes.description).toEqual(description);
            })
            .catch(fail)
            .fin(done);
    });
    it('Disable Media Source', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.stopMediaResource(mediaId)
            .then(function () {
                return vod.getMediaResource(mediaId);
            })
            .then(function (response) {
                expect(response.body.mediaId).toEqual(mediaId);
                expect(response.body.status).toEqual(MediaStatus.DISABLED);
            })
            .catch(fail)
            .fin(done);
    });
    it('Publish Media Source', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.publishMediaResource(mediaId)
            .then(function () {
                return vod.getMediaResource(mediaId);
            })
            .then(function (response) {
                expect(response.body.mediaId).toEqual(mediaId);
                expect(response.body.status).toEqual(MediaStatus.PUBLISHED);
            })
            .catch(fail)
            .fin(done);
    });
    it('Update Media Source', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        title = 'updateTitle' + (+new Date());
        description = 'updateDescription' + (+new Date());
        vod.updateMediaResource(mediaId, title, description)
            .then(function () {
                return vod.getMediaResource(mediaId);
            })
            .then(function (response) {
                expect(response.body.mediaId).toEqual(mediaId);
                expect(response.body.attributes.title).toEqual(title);
                expect(response.body.attributes.description).toEqual(description);
            })
            .catch(fail)
            .fin(done);
    });
    it('Get Player Code', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.getPlayerCode(mediaId, 800, 600, true)
            .then(function (response) {
                var codes = u.filter(response.body.codes, function (code) {
                    return u.contains(CodeType, code.codeType);
                });
                expect(codes.length).toEqual(3);
                u.each(codes, function (code) {
                    if (code.codeType === 'url') {
                        expect(code.sourceCode).toMatch(/^http:\/\//);
                    }
                    else {
                        expect(code.sourceCode).toMatch(/[a-zA-Z0-9+/]+/);
                    }
                });
            })
            .catch(fail)
            .fin(done);
    });
    it('Get Playable Url', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.getPlayableUrl(mediaId)
            .then(function (response) {
                expect(response.body.result.file).toMatch(/^http:\/\//);
                expect(response.body.result.media_id).toEqual(mediaId);
            })
            .catch(fail)
            .fin(done);
    });
    it('Delete Media Source', function (done) {
        expect(mediaId).not.toBeUndefined();
        var vod = new VodClient(config.media, config.media_bos);
        vod.deleteMediaResource(mediaId)
            .then(function () {
                return vod.listMediaResource();
            })
            .then(function (response) {
                var uploadMedia = u.filter(response.body.media, function (media) {
                    return media.mediaId === mediaId;
                });
                expect(uploadMedia.length).toEqual(0);
            })
            .catch(fail)
            .fin(done);
    });

});

/* vim: set ts=4 sw=4 sts=4 tw=120: */
