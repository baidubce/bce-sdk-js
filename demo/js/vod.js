$(document).ready(function () {
    hljs.initHighlightingOnLoad();

    var sdk = window.baidubce.sdk;
    var vodConfig = {
        credentials: {
            ak: 'f5569b0a5aa5412481e755d8b912c504',
            sk: '931c7641fa324821a75b50de4c343ced'
        },
        sessionToken: ''
    };

    var $fileList = $('#fileList');
    var vodClient = new sdk.VodClient(vodConfig);

    function updateList() {
        vodClient.listMediaResource().then(function (data) {
            var html = "";
            if (data && data.body && data.body.media) {
                for (var i = 0; i < data.body.media.length; i++) {
                    var media = data.body.media[i];
                    html += '<tr data-id="' + media.mediaId + '">' +
                        '<td>' + media.attributes.title + '</td>' +
                        '<td>' + media.attributes.description + '</td>' +
                        '<td class="media-id">' + media.mediaId + '</td>' +
                        '<td>' +
                        '<a href="javascript:void 0;" class="btn link-btn delete">删除</a>' +
                        '<a href="javascript:void 0;" class="btn link-btn url">获取视频地址</a>' +
                        '<a href="javascript:void 0;" class="btn link-btn code">获取播放代码</a>' +
                        '</td></tr>';
                }
            }
            $fileList.html(html);
        }).catch(function (err) {
            toastr.error('请求失败');
        });
    }

     updateList();
    $('#upload').on('change', function (evt) {
        var file = evt.target.files[0];
        vodClient = new sdk.VodClient(vodConfig);
        var $row = $('<tr class="uploading">' +
            '<td>' + file.name + '</td>' +
            '<td>测试文件</td>' +
            '<td class="media-id">' +
            '<div class="progress"><div class="progress-bar progress-bar-success" style="width: 0;"></div></div>' +
            '</td>' +
            '<td>' +
            '<a href="javascript:void 0;" class="btn link-btn delete">删除</a>' +
            '<a href="javascript:void 0;" class="btn link-btn url">获取视频地址</a>' +
            '<a href="javascript:void 0;" class="btn link-btn code">获取播放代码</a>' +
            '</td></tr>');
        vodClient.createMediaResource(file.name, '测试文件', file).then(function (res) {
            // 可以通过res.body.mediaId获取上传完成的媒体资源id
            var id = res.body.mediaId;
            toastr.success('上传成功, 媒体资源id为: ' + id);
            $row.removeClass('uploading').attr('data-id', id).find('.media-id').text(id);
        }).catch(function (err) {
            toastr.error('上传失败');
        });
        $fileList.append($row);
        vodClient.on('progress', function (evt) {
            // 处理上传进度
            if (evt.uploadId) {
                // 如果是分块上传,各个分块上传时也会发出progress事件,为了简化代码,先忽略这类事件
                return;
            }
            if (evt.lengthComputable) {
                var width = (evt.loaded / evt.total) * 100;
                $row.find('.progress-bar').css('width', width + '%')
                    .text(width.toFixed(2) + '%');
            }
        });
    });

    $fileList.on('click', '.delete', function (e) {
        var mediaId = $(e.target).closest('tr').attr('data-id');
        vodClient.deleteMediaResource(mediaId).then(function () {
            toastr.success('删除成功');
            // updateList();
            $(e.target).closest('tr').remove();
        }).catch(function (err) {
            toastr.error('删除失败');
        });
    });
    $fileList.on('click', '.url', function (e) {
        var mediaId = $(e.target).closest('tr').attr('data-id');
        vodClient.getPlayableUrl(mediaId).then(function (data) {
            if (data.body.result.cover) {
                $('#cover').html('<img src="' + data.body.result.cover + '" />');
            }
            else {
                $('#cover').text('无封面');
            }
            $('#file').text(data.body.result.file);
            $('#url').modal();
        }).catch(function (err) {
            toastr.error('请求失败');
        });
    });

    $fileList.on('click', '.code', function (e) {
        var mediaId = $(e.target).closest('tr').attr('data-id');
        vodClient.getPlayerCode(mediaId, 800, 600, true).then(function (data) {
            var html = '';
            for (var i = 0; i < data.body.codes.length; i++) {
                var code = data.body.codes[i];
                if (code.codeType !== 'url') {
                    code.codeType += '(base64 encoded)';
                }
                html += '<div class="panel panel-info">' +
                    '<div class="panel-heading">' + code.codeType + '</div>' +
                    '<div class="panel-body"><pre>' + code.sourceCode + '</pre></div>' +
                    '</div>';
            }
            $('#codeList').html(html);
            $('#code').modal();
        }).catch(function (err) {
            toastr.error('请求失败');
        });
    });

});
