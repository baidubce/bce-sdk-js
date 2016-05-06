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

import path from 'path';

import u from 'underscore';
import _debug from 'debug';
import expect from 'expect.js';

import config from '../config';
import {VodClient} from '../../';
import helper from './helper';

let debug = _debug('vod_client.spec');

let MediaStatus = {
    PUBLISHED: 'PUBLISHED',
    FAILED: 'FAILED',
    RUNNING: 'RUNNING',
    DISABLED: 'DISABLED',
    BANNED: 'BANNED'
};
let CodeType = [
    'html',
    'flash',
    'url'
];

describe('VodClient', function () {
    let mediaId;
    let title = 'testTitle' + (+new Date());
    let description = 'testDescription' + (+new Date());

    this.timeout(10 * 60 * 1000);

    beforeEach(function () {
    });

    afterEach(function () {
        // TODO
    });

    it('Create Media Source', function () {
        let vod = new VodClient(config.vod);
        let filePath = path.join(__dirname, 'BigBuckBunny_320x180.mp4');
        return vod.createMediaResource(title, description, filePath)
            .then(function (response) {
                debug(response);
                mediaId = response.body.mediaId;
                expect(mediaId).not.to.be(undefined);
                return helper.loop(600, 30, function () {
                    return vod.getMediaResource(mediaId)
                        .then(function (response) {
                            debug('loop = %j', response.body);
                            if (response.body.status === 'RUNNING') {
                                throw '$continue';
                            }
                        });
                });
            });
    });

    it('Get Media Source', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.getMediaResource(mediaId)
            .then(function (response) {
                debug(response);
                expect(response.body.mediaId).to.eql(mediaId);
                expect(response.body.attributes.title).to.eql(title);
                expect(response.body.attributes.description).to.eql(description);
            });
    });

    it('Get All Media Sources', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.listMediaResource()
            .then(function (response) {
                debug(response);
                let uploadMedia = u.filter(response.body.media, function (media) {
                    return media.mediaId === mediaId;
                });
                expect(uploadMedia.length).to.eql(1);
                expect(uploadMedia[0].attributes.title).to.eql(title);
                expect(uploadMedia[0].attributes.description).to.eql(description);
            });
    });

    it('Disable Media Source', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.stopMediaResource(mediaId)
            .then(function () {
                return vod.getMediaResource(mediaId);
            })
            .then(function (response) {
                debug(response);
                expect(response.body.mediaId).to.eql(mediaId);
                expect(response.body.status).to.eql(MediaStatus.DISABLED);
            });
    });

    it('Publish Media Source', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.publishMediaResource(mediaId)
            .then(function () {
                return vod.getMediaResource(mediaId);
            })
            .then(function (response) {
                debug(response);
                expect(response.body.mediaId).to.eql(mediaId);
                expect(response.body.status).to.eql(MediaStatus.PUBLISHED);
            });
    });

    it('Update Media Source', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        title = 'updateTitle' + (+new Date());
        description = 'updateDescription' + (+new Date());
        return vod.updateMediaResource(mediaId, title, description)
            .then(function () {
                return vod.getMediaResource(mediaId);
            })
            .then(function (response) {
                debug(response);
                expect(response.body.mediaId).to.eql(mediaId);
                expect(response.body.attributes.title).to.eql(title);
                expect(response.body.attributes.description).to.eql(description);
            });
    });

    it('Get Player Code', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.getPlayerCode(mediaId, 800, 600, true)
            .then(function (response) {
                debug(response);
                let codes = u.filter(response.body.codes, function (code) {
                    return u.contains(CodeType, code.codeType);
                });
                expect(codes.length).to.eql(3);
                u.each(codes, function (code) {
                    if (code.codeType === 'url') {
                        expect(code.sourceCode).to.match(/^http:\/\//);
                    }
                    else {
                        expect(code.sourceCode).to.match(/[a-zA-Z0-9+/]+/);
                    }
                });
            });
    });

    it('Get Playable Url', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.getPlayableUrl(mediaId)
            .then(function (response) {
                debug(response);
                expect(response.body.result.file).to.match(/^http:\/\//);
                expect(response.body.result.media_id).to.eql(mediaId);
            });
    });

    it('Delete Media Source', function () {
        expect(mediaId).not.to.be(undefined);
        let vod = new VodClient(config.vod);
        return vod.deleteMediaResource(mediaId)
            .then(function () {
                return vod.listMediaResource();
            })
            .then(function (response) {
                debug(response);
                let uploadMedia = u.filter(response.body.media, function (media) {
                    return media.mediaId === mediaId;
                });
                expect(uploadMedia.length).to.eql(0);
            });
    });
});
