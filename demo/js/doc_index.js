$(document).ready(function () {
    hljs.initHighlightingOnLoad();

    var sdk = window.baidubce.sdk;
    // var tokenUrl = 'http://180.76.166.159:1337/ack';
    var docConfig = {
        credentials: {
            ak: '',
            sk: ''
        }
    };

    var $fileList = $('#fileList');

    $('#upload').on('change', function (evt) {
        return (function (evt) {
            var file = evt.target.files[0];
            var client = new sdk.DocClient.Document(docConfig);
            var key = file.name;
            var blob = file;
            var id = +new Date();
            var $row = $('<tr id="' + id + '">' +
                '<td class="file-name">' + key + '</td>' +
                '<td>' + fileSize(blob.size) + '</td>' +
                '<td class="documentId">' + '</td>' +
                '<td class="file-detail">' +
                '<div class="progress"><div class="progress-bar progress-bar-success" style="width: 0;"></div></div>' +
                '</td>' +
                '</tr>');
            $row.appendTo($fileList);
            var ext = key.split(/\./g).pop();
            var mimeType = sdk.MimeType.guess(ext);
            mimeType += '; charset=UTF-8';
            var options = {
                'Content-Type': mimeType
            };

            var promise;
            promise = client.create(file);
            client.on('progress', function (evt) {
                client.emit('overallProgress', evt);
            });
            client.on('overallProgress', function (evt) {
                if (evt.lengthComputable) {
                    var width = (evt.loaded / evt.total) * 100;
                    $row.find('.progress-bar').css('width', width + '%')
                        .text(width.toFixed(2) + '%');
                }
            });
            promise.then(function (response) {
                    toastr.success('上传成功');
                    $row.find('.documentId').html(response.body.documentId);
                    $row.find('.file-detail').html('完成');
                })
                .catch(function (err) {
                    toastr.error('上传失败');
                });
        })(evt);
    });
    function fileSize(num) {
        num = +num;
        var unit = ['Byte', 'KB', 'MB', 'GB', 'TB', 'PB'];
        var index = 0;
        while (num > 1024) {
            num = num / 1024;
            index++;
        }
        return num.toFixed(1) + unit[index];
    }
});
