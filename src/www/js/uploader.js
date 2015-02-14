function loadUrl(url, reader, file, callback) {
    ID3.loadTags(url, function() {
        callback(ID3.getAllTags(url));
    }, {
        tags: ["artist", "title"],
        dataReader: reader
    });
}
var sendall = $('<div id="sendall"><a href="javascript:void(0);">Отправить все!</a></div>');
var voteadjust = $('<div id="voteadjust">Рейтинг: <input type="number" name="vote"></div>');
var defered = false;

function addupload(file) {
    var fup = $('<div class="uploaditem" />').appendTo($('#console .upfiles'));
    var trpath = $('<div class="path">' + file.name + '</div>').appendTo(fup);
    var abort = $('<div class="abort"></div>').appendTo(fup);
    var artist = $('<input class="finput artist" type="text" autocomplete="on" placeholder="Артист">').appendTo(fup);
    var title = $('<input class="finput title" type="text" placeholder="Название">').appendTo(fup);
    var trackinfo = $('<textarea class="finput trackinfo" type="text" placeholder="Пара слов о треке"></textarea><br />').appendTo(fup);
    $('<span>Теги:</span>').appendTo(fup);
    var tagscontainer = $('<div class="tags"></div>').appendTo(fup);
    $('<input list="autotags" class="finput taginput" type="text" placeholder="начинай вводить..."><datalist id="autotags"></datalist><span>Enter - добавить</span>').appendTo(fup);
    var isStream = $('<div><div class="button stream"><a href="javascript:void(0);">Live</a></div></div>').appendTo(fup);
    var progress = $('<div class="progress"></div>').appendTo(fup);
    loadUrl(file.urn || file.name, new FileAPIReader(file), file, function(tags) {

        if (tags.artist) {
            artist.val(tags.artist);
        }
        if (tags.title) {
            title.val(tags.title);
        }
    });
    var autotags = $(fup).children('#autotags');
    var taginput = $(fup).children('.taginput');
    var bar = $('<div class="bar"></div>').appendTo(progress);

    var trackupload = $('<div class="button upload"><a href="javascript:void(0);">Загрузить</a></div>').appendTo(fup);
    var tracksubmit = $('<div class="button send"><a href="javascript:void(0);">Отправить</a></div>').appendTo(fup);
    var errors = $('<div class="errors"></div>').appendTo(fup);
    var uploader = $('<input id="uploader" type="file" data-url="upload/server/php/" style="display:none">').appendTo(fup);
    var islive = false;
    var jqXHR = null
    $(progress).hide();
    $(uploader).fileupload({
        add: function() {
        },
        progressall: function(e, data) {
            console.log(data.loaded);
            var progress = parseInt(data.loaded / data.total * 100, 10);
            $(bar).css('width', progress + '%');
        }
    });
    abort.click(function() {
        if (jqXHR) {
            jqXHR.abort();
        }
        fup.hide(300, function() {
            this.remove();
            if ($('#console .upfiles .uploaditem').length < 2) {
                sendall.remove();
            }
            if ($('#console .upfiles .uploaditem').length < 1) {
                voteadjust.remove();
            }
        });
    });
    var ready = false;
    var uploaded = false;
    var serverfilename = null;
    var tmt = null;
    var servertags = [];
    var temptags = [];
    var requested = false;
    var uploadercallback = false;


    var addtotags = function(callback) {
        var chose = $(taginput).val();
        var is = false;
        for (var t in temptags) {
            if (temptags[t].n == chose) {
                is = true;
                var inlist = false;
                for (var st in servertags) {
                    if (servertags[st].id == temptags[t].id) {
                        inlist = true;
                        break;
                    }
                }
                if (!inlist) {
                    servertags.push(temptags[t]);
                    var tagitem = $('<div class="tag">' + temptags[t].n + '<div class="deltag" /></div>').appendTo($(tagscontainer));
                    tagitem.attr('tagid', temptags[t].id);
                    $(tagitem).children('.deltag').click(function() {
                        for (var st in servertags) {
                            if (servertags[st].id == $(tagitem).attr('tagid')) {
                                servertags.splice(st, 1);
                                break;
                            }
                        }
                        $(tagitem).remove();
                    });
                    $(taginput).val('');
                    requested = false;
                }
                if (callback) {
                    callback();
                }
                break;
            }
        }
        if (!is) {
            if (!requested) {
                console.log('not requested');
                client.getTags($(taginput).val(), function(data) {
                    requested = true;
                    temptags = data;
                    addtotags(callback);
                });
            } else {
                console.log('not finded');
                client.addTag($(taginput).val(), function(data) {
                    requested = true;
                    temptags = data;
                    addtotags(callback);
                });
            }
        }
    }

    taginput.bind("keyup", function(event) {
        if (event.keyCode == 13) {
            addtotags();
        } else {
            if ($(taginput).val().length > 0) {
                if (tmt) {
                    clearTimeout(tmt);
                }
                tmt = setTimeout(function() {
                    client.getTags($(taginput).val(), function(data) {
                        requested = true;
                        temptags = data;
                        var av = [];
                        for (var t in temptags) {
                            av.push(temptags[t].n);
                        }
                        $(taginput).autocomplete({
                            source: av,
                            search: ''
                        });

                    });
                }, 400);
            }
        }
    });
    tracksubmit.submit = function(data) {
        ready = true;
        if (islive) {
            uploaded = true;
            serverfilename = $('.finput.stream').val();
            if (serverfilename.length < 7) {
                errors.html('И ежу понятно что это не поток ;)');
                return;
            }
        } else {
            if (!jqXHR) {
                trackupload.upload();
            }
        }
        if (uploaded) {
            errors.html('');
            if (!title.val().length) {
                errors.html('У трека должно быть название!');
                return;
            }
            if (!artist.val().length) {
                errors.html('Будь мужиком, укажи артиста!');
                return;
            }
            var form = $(this).parent();

            uploadercallback = function() {
                var votevalue = parseInt(voteadjust.children('input').attr('value'));
                var trk = {
                    'live': islive,
                    'artist': artist.val(),
                    'title': title.val(),
                    'info': trackinfo.val(),
                    'tags': servertags,
                    'vote': votevalue,
                    'path': serverfilename
                };
                client.tracksubmit({
                        'chid': client.channel.id,
                        'track': trk
                    },
                    function(data) {
                        if (!data.error) {
                            form.hide(300, function() {
                                this.remove();
                                if ($('#console .upfiles .uploaditem').length < 2) {
                                    sendall.remove();
                                }
                                if ($('#console .upfiles .uploaditem').length < 1) {
                                    voteadjust.remove();
                                }
                                if (defered && uploadarray.length) {
                                    uploadarray.shift();
                                    uploadarray[0].submit();
                                } else {
                                    defered = false;
                                }
                            });

                        } else {
                            errors.html(data.error);
                        }
                    }
                );
            }
            if ($(taginput).val().length) {
                addtotags(uploadercallback);

            } else {
                uploadercallback();
            }
        }

    }
    trackupload.upload = function() {
        trackupload.hide();
        errors.html('');
        var submiter = tracksubmit;
        console.log('Start upload');
        jqXHR = uploader.fileupload('send', {
            files: [file]
        })
            .error(function(jqXHR, textStatus, errorThrown) {
                errors.html(textStatus);
                trackupload.show();
                console.log('XHP error', textStatus);
            })
            .complete(function(result, textStatus, jqXHR) {
                console.log("upload result - ", result, textStatus);
                serverfilename = JSON.parse(result.responseText).files[0].name;
                uploaded = true;
                if (ready) {
                    submiter.trigger('click');
                }
            });
        $(progress).show(200);
    }
    isStream.click(function() {
        if (!islive) {
            trackupload.hide();
            islive = true;
            isStream.html('<br><br>Это очень страшная кнопка! Похоже ты действительно хочешь выйти в эфир. В поле чуть ниже укажи адрес потока, который собираешься транслировать. Если ты не знаешь о чем идет речь, срочно откажись от этой затеи! Мы не шутим!<br><input class="finput stream" type="text" placeholder="URL потока">');
        }
    });
    trackupload.click(trackupload.upload);
    tracksubmit.click(tracksubmit.submit);
    voteadjust.prependTo($('#console .upfiles'));
    voteadjust.children('input').attr('value', client.user.w).attr('max', client.user.w).attr('min', client.user.w - (client.user.w * 2));

    if ($('#console .upfiles .uploaditem').length > 1 && $('#sendall').length == 0) {
        sendall.prependTo($('#console .upfiles'));
        sendall.click(function() {
            $('#console .upfiles .uploaditem .button.send').trigger('click');
        });
    }

}

