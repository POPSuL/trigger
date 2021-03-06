(function($) {
    $.fn.autofocus = function() {
        return (this[0].autofocus !== true) ? this.focus() : this;
    };
})(jQuery);

var timezone = 10800000, stream_mode = '', client = null, remember_name = true, mutetrack = false, tink = true, noimg = false, historyprocess = false, lht = 0, lang = 'ru', recovery = false, mutelist = [], ctrl = false;
var switch_style = function(css_title) {
// You may use this script on your site free of charge provided
// you do not remove this notice or the URL below. Script from
// http://www.thesitewizard.com/javascripts/change-style-sheets.shtml
    var i, link_tag;
    for (i = 0, link_tag = document.getElementsByTagName("link"); i < link_tag.length; i++) {
        if ((link_tag[i].rel.indexOf("stylesheet") != -1) && link_tag[i].title) {
            link_tag[i].disabled = true;
            if (link_tag[i].title == css_title) {
                link_tag[i].disabled = false;
            }
        }
        var buttonstring = '<a href=\'#\' onclick="switch_style(\'day\');return false;">' + locale.mk_day + '</a>';
        if (css_title == 'day') {
            buttonstring = '<a href=\'#\' onclick="switch_style(\'nigth\');return false;">' + locale.mk_night + '</a>';
        }
        $('#styleswitch').html(buttonstring);
        $.Storage.set("style", css_title);
    }
}


$(document).ready(function() {
    jQuery.easing.def = "easeOutExpo";
    $('.loginform').hide();
    player = new Player();

    var vol = parseInt($.Storage.get("volume"));
    if (vol > 0) {
        vol = vol / 1000;
        $('#volume .slider .bar').width(vol*125);
        player.volume(vol);
    }
    $('.streamcontrol .play').click(function() {
        player.play();
        $('.streamcontrol .play').hide();
        $('.streamcontrol .stop').show();
        $.Storage.set("play", 'true');
    });
    $('.streamcontrol .stop').click(function() {
        player.stop();
        $('.streamcontrol .stop').hide();
        $('.streamcontrol .play').show();
        $.Storage.set("play", 'false');
    });
    $('.streamcontrol .play').show();
    $('.streamcontrol .stop').hide();

    $('#volume .slider').bind('mousedown', function(e) {
        e.preventDefault();
        setvolume(e);
        $(window).bind('mousemove', setvolume);
        $(window).mouseup(function() {
            $(window).unbind('mousemove', setvolume);
        });
    });


    lang = $.Storage.get("lang");
    if (lang) {
        switch_lang(lang);
    } else {
        switch_lang('ru');
    }

    var sheet = $.Storage.get("style");
    if (sheet) {
        switch_style(sheet);
    } else {
        switch_style('day');
    }
    var t = $.Storage.get("tink");
    if (t) {
        if (t == 'false') {
            tink = false;
        } else {
            tink = true;
        }
    } else {
        $.Storage.set("tink", 'true');
    }
    var mtr = $.Storage.get("mutetrack");
    if (mtr) {
        if (t == 'false') {
            mutetrack = false;
        } else {
            mutetrack = true;
        }
    } else {
        mutetrack = false;
    }
    var ni = $.Storage.get("noimg");
    if (ni) {
        if (ni == 'false') {
            noimg = false;
        } else {
            noimg = true;
        }
    } else {
        $.Storage.set("noimg", 'false');
    }
    var ni = $.Storage.get("noimg");
    if (ni) {
        if (ni == 'false') {
            noimg = false;
        } else {
            noimg = true;
        }
    } else {
        $.Storage.set("noimg", 'false');
    }













	var iframestore = window.frames.iframestore;

    window.addEventListener('message',function(e) {
        var key = e.message ? 'message' : 'data';
        var data = e[key];
        console.log(e);
	    iframestore.postMessage({somedata:'wedfsdasdasdasd'}, "http://trigger.fm");
    },false);








    client = new Client();
    $(client).bind('welcome', function(event, data) {
        if (data) {
            showControlPanel(data);
            welcomedata = data;
            var user = $.Storage.get("username"), pass = $.Storage.get("password");

            if (user) {
                if (pass) {
                    client.login(user, pass, processLogin);
                } else {
                    parser();
                }
            } else {
                parser();
            }
        } else {

        }

    });
    $(client).bind('disconnect', function(event, data) {
        $('.content').hide();
        $('.submit_box').hide();
        $('.loginform').show();
        $('#info .tabs .chat').hide();
        $('.loginform .alert').html('потеряно соединение с сервером');
        $('#console .upfiles').hide();

    });
    $(client).bind('message', function(event, data) {
        var move = false;
        if ($('.log')[0].scrollHeight - $('.log').scrollTop() == $('.log').outerHeight()) {
            move = true;
        }
        addMessage(data);
        if (move) {
            $('.log').animate({scrollTop: $('.log')[0].scrollHeight}, 1200);
        }
    });

    $(client).bind('addtrack', function(event, data) {
        var move = false;
        if ($('.log')[0].scrollHeight - $('.log').scrollTop() == $('.log').outerHeight()) {
            move = true;
        }

        var message = $('<div class="message"><p class="who"><a href="javascript:addNick(\'' + data.track.s + '\');void(0);">' + data.track.s + '</a>' + ' прнс </p><p class="track"> <a class="tracklink" href="#">' + data.track.a + ' - ' + data.track.t + '</a><br />' + data.track.i + '</p><div class="end"/></div>').appendTo($('#chatmessages'));
        message.find('.tracklink').click(function() {
            opentrack(data.track);
        });
        if (move) {
            $('.log').animate({scrollTop: $('.log')[0].scrollHeight}, 1200);
        }
        addtrack(data.track);
    });
    $(client).bind('removetrack', function(event, data) {
        removetrack(data.track.id);
    });
    $(client).bind('newuser', function(event, data) {
        fillUserlist();
    });
    $(client).bind('listners', function(event, data) {
        $('#info .controlpage.channels #' + data.chid + ' .listners').html('<span>' + locale.l_listen + ' </span> ' + data.l);
        if (data.chid == client.channel.chid) {
            //  $('#console .info .chdata').html('<span>' + locale.l_listen + '</span>' + data.l + '<span class="l_active">' + locale.l_active + ' </span>' + data.a);
            $('#console .info .chdata').html('<span>' + locale.l_listen + ' </span> ' + data.l);
        }
        if ($('.controlpage.channels').hasClass('active')) {
            fillchannelsdata(client.channels);
        }

    });
    $(client).bind('offuser', function(event, data) {
        fillUserlist();
    });
    $(client).bind('updatelimits', function(event, data) {
        newTagline();
    });
    $(client).bind('channelthershold', function(event, data) {
        console.log('threshold update');
        console.log(event);
        console.log(data);
        client.channel.threshold = data;
        newTagline();
    });
    $(client).bind('newcurrent', function(event, data) {
        if (data.chid == client.channel.chid) {
            setCurrent(data.track);
            player.mute(false);
            setcurtime(true);
        }

        $('#info .controlpage.channels #' + data.chid + ' .current').html('<div class="cap">Сейчас:</div><div class="artist">' + data.track.a + '</div><div class="title">' + data.track.t + '</div><span><a href="http://vk.com/audio?q=' + encodeURIComponent(data.track.a) + ' - ' + encodeURIComponent(data.track.t) + '" target="_blank">>vk</a></span>');
    });
    $(client).bind('trackupdate', function(event, data) {
        if (data.current) {
            data.t.current = true;
        }
        updateTrack(data.t);
    });
    $(client).bind('userupdate', function(event, data) {
        refreshuser(data);
    });
    $(client).bind('banned', function(event, data) {
        $('#info .tabs .tab.channels').click();
    });
    setInterval(function() {
        var avalible = client.channel.current;
        if (avalible) {
            client.channel.ct += 1;
            if (client.channel.ct > client.channel.current.tt) {
                client.channel.ct = client.channel.current.tt;
            }
            setcurtime();
            updatetimes();
        }
    }, 1000);

    client.init(location.host);

    $("#remember").change(function() {
        var $input = $(this);
        remember_name = $input.is(':checked');
    });
    //$('#console .serverinfo.greating').html('<a href="http://vk.com/triggerfm?w=wall-55048733_429" target="_blank"><img src="http://cs312429.vk.me/v312429536/818b/X0kMKL5ouUI.jpg"></a>');

    $('#console .loginform .button').click(goLogin);
    $('#lgpass').bind('keyup', function(e) {
        if (e.keyCode == 13) {
            goLogin();
        }
    });

    $('#fileupload').fileupload({
        dataType: 'json',
        add: function(e, data) {
            $.each(data.files, function(index, file) {
                if (client.user) {
                    addupload(file);
                }
            });
        }
    });
    $('#info .tab').bind('mouseenter mouseleave', function() {
        if (!$(this).hasClass('active')) {
            $(this).children('a').toggleClass('hover');
        }
    });
    //переключалка закладок
    $('#info .tabs .tab').bind('click', function() {
        if (!$(this).hasClass('active')) {
            $('#info .tabs .tab').removeClass('active').children('a').removeClass('hover');
            $(this).addClass('active').children('a').addClass('hover');
            $('#info .content').hide();
            if ($(this).hasClass('chat')) {
                if (location.hash != '#!/chat/') {
                    location.hash = '#!/chat/';
                }
                $('.content.chat').show();
                fillChat();
                onresize();
            }
            if ($(this).hasClass('channels')) {
                if (client.user) {
                    if (location.hash.split('/').length < 2) {
                        location.hash = '#!/' + controldesk_mode + '/';
                    }
                    showControlPanel();
                } else {
                    showControlPanel();
                }
            }
            if ($(this).hasClass('history')) {
                location.hash = '#!/history/';
                $('#hpanel .finput.artist').val('');
                $('#hpanel .finput.title').val('');
                $('#showgold').prop('checked', false);
                $('#showtop').prop('checked', false);
                showHistory();
            }
            if ($(this).hasClass('profile')) {
                $('.content.profile').show();
                if (client.user) {
                    getuser(client.user.id);
                }
            }
        }
    });


    $('#info .tabs .chat').hide();
    $('#info .tabs .profile').hide();
    $('#info .tabs .election').hide();

    $('#messageinput').bind("keyup", function(event) {
        if (event.keyCode == 13) {
            submitMessage();
        }
    });
    $('#messageinput').focusin(function() {
        $('.log').animate({scrollTop: $('.log')[0].scrollHeight}, 1200);
    });

    $('#chattink').click(function() {
        tink = $(this).is(':checked');
        settink();
    });

    $('#chatshowimg').click(function() {
        noimg = !$(this).is(':checked');
        setnoimg();
    });


    $('#console .streamcontrol .stop').hide();
    $('.content').hide();
    $('.submit_box').hide();
    $('#recovery').html('<a href="javascript:recoverymode(true); void(0);">Я забыл пароль</a>');
});


$(window).bind('hashchange', function() {
    if (location.hash.length) {
        var dec = location.hash.split('/')
        if (dec[1] == 'user') {
            getuser(dec[2]);
        }
        if (dec[1] == 'blog') {
            controldesk_mode = 'blog';
            $('#info .tabs .channels').click();
            showControlPanel();
        }
    } else {
        if (client.user) {
            location.hash = '#!/chat/';
        } else {
            location.hash = '#!/democracy/';
        }
    }
    switch (location.hash) {
        case '#!/chat/':
            $('#info .tabs .chat').click();
            break;

        case '#!/history/':
            $('#info .tabs .history').click();
            break;

        case '#!/democracy/':
            controldesk_mode = 'democracy';
            $('#info .tabs .channels').click();
            showControlPanel();
            break;
    }
});


function getElectionData() {
    client.getElection(function(data) {
        console.log(data);
    });
}

function recoverymode(b) {
    recovery = b;
    if (recovery) {
        $('#console .loginform .button').html('<a href="javascript:void(0);">Вспомнить</a>');
        $('#recovery').html('<a href="javascript:recoverymode(false); void(0);">Я вспомнил!</a>');
        $('#lgpass').hide();
        $('#save').hide();
        $('#lgname').attr('placeholder', 'Почта');
        $('.loginform .alert').html('Введи адрес ящика на который приходил инвайт');
    } else {
        $('#console .loginform .button').html('<a href="javascript:void(0);">Вход</a>');

        $('#recovery').html('<a href="javascript:recoverymode(true); void(0);">Я забыл пароль</a>');
        $('#lgpass').show();
        $('#lgname').attr('placeholder', 'Юзернейм');
        $('#save').show();
        $('.loginform .alert').html('');
    }

}

function setmute() {
    if (mutetrack) {
        $.Storage.set("mutetrack", 'true');
    } else {
        $.Storage.set("mutetrack", 'false');
    }
}

function settink() {
    if (tink) {
        $.Storage.set("tink", 'true');
    } else {
        $.Storage.set("tink", 'false');
    }
    $('#info .content.chat .log').animate({scrollTop: $('.log')[0].scrollHeight}, 1200);
}

function setnoimg() {
    if (noimg) {
        $.Storage.set("noimg", 'true');
        $('#info .log').find("img").css('display', 'none').after('<span class="pc">картинка</span>');
    } else {
        $.Storage.set("noimg", 'false');
        $('#info .log').find("img").css('display', '');
        $('#info .log .pc').remove();
    }
    $('#info .content.chat .log').animate({scrollTop: $('.log')[0].scrollHeight}, 1200);
}
function verbalTime(delta) {
    if (delta < 1) {
        return false;
    }
    if (delta < 60000) {
        return 'несколько секунд';
    }
    if (delta > 60000 && delta < 1800000) {
        var tm = Math.round(delta / 60000);
        var str = tm.toString();
        var ttm = parseInt(str[length - 1]);
        var mes = ' минут';
        if (tm < 2) {
            tm = '';
            mes = ' минуту';
        }
        if (tm > 1 && tm < 5) {
            mes = ' минуты';
        }
        return tm + mes;
    }
    if (delta > 1800000 && delta < 3600000) {
        return 'полчаса';
    }
    if (delta > 3600000 && delta < 7200000) {
        return 'час';
    }
    if (delta > 7200000) {
        if (delta < 10800000) {
            return Math.round(delta / 3600000) + ' часа';
        } else {
            return Math.round(delta / 3600000) + ' часов';
        }
    }
}

var taglinetimer = null;

function newTagline() {
    if (client.user && origins.length > 0) {
        var username = '<a href="javascript:getuser(' + client.user.id + ');void(0);">' + client.user.n + '</a>';
        var co = origins[Math.floor(Math.random() * origins.length)].replace('username', username) + '<br />';
        if (localStorage.getItem('xss')) {
            //co='Твой аккаунт мог быть угнан, '+username+'! Воспользуйся менялкой пароля в подводных камнях!'
        }
        $('#console .userinfo').html(co);

        $('#console .userinfo').prepend('<div id="limits">Порог золота: ' + client.channel.threshold + '</div>');


        var tl = new Date(client.user.t * 1000);
        var limit = tl.toUTCString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");

        if (client.channel.chid == 1) {
            if (client.channel.pls.length < 21) {
                $('#console .userinfo').prepend('<div id="limits">Сейчас нет лимитов!</div>');
            } else if (client.chat) {
                if (client.chat.u.length < 11) {
                    $('#console .userinfo').prepend('<div id="limits">Сейчас нет лимитов!</div>');
                }
            }
            $('#console .userinfo').prepend('<div id="limits">' + locale.canupload + limit + '</div>');
        } else {
            $('#console .userinfo').prepend('<div id="limits">Здесь нет лимитов ;)</div>');
        }

        $('#limits').hover(function() {
                var verbal = verbalTime(Date.parse(client.user.nt) - Date.parse(new Date()));
                if (!verbal) {
                    $(this).append('<span>За последние 12 часов не было ни одного трека от тебя</span>');
                } else {
                    $(this).append('<span class>Cледующее обновление через</span> ' + verbalTime(Date.parse(client.user.nt) - Date.parse(new Date())) + '</span>');
                }
            },
            function() {
                $(this).html(locale.canupload + limit);
            });
    }
    if (taglinetimer) {
        clearTimeout(taglinetimer);
    }
    taglinetimer = setTimeout(newTagline, 90000);
}

function onChannel(data) {
    if (data.current) {
        setCurrent(data.current);
    }
    setcurtime(true);
    $.Storage.set("channel", client.channel.chid + ' ');
    stream_mode = $.Storage.get("stream_mode");



    if (!stream_mode) {
        stream_mode = 'ogg';
        if (!player.canplay('audio/ogg')) {
            stream_mode = 'mp3';
        }
        $.Storage.set("stream_mode", stream_mode);

    }
    console.log('stream_mode', stream_mode);
    $('#console .info .chname').html('<a href="javascript:showControlPanel();void(0);">' + data.name + '<a>');
    $('#console .info .chdata').html('<span>' + locale.l_listen + ' </span> ' + data.lst);
    //  $('#console .info .chdata').html('<span>' + locale.l_listen + ' </span>' + data.lst + '<span>' + locale.l_active + ' </span>' + data.a);
    $('#console .streamcontrol .links').html('<a href="' + client.channel.hi + '" class="ogg" title="~96kbps" target="_blank">ogg</a> | <a href="' + client.channel.low + '" class="mp3" title="320kbps" target="_blank">mp3</a>');
    if (stream_mode == 'ogg') {
        $('#console .streamcontrol .links .mp3').addClass('blured');
    } else {
        $('#console .streamcontrol .links .ogg').addClass('blured');
    }
    $('#console .streamcontrol .links .ogg').click(function(e) {
        if (stream_mode != 'ogg') {
            if (player.canplay('audio/ogg')) {
                e.preventDefault();
                $('#console .streamcontrol .links').children().removeClass('blured');
                $('#console .streamcontrol .links .mp3').addClass('blured');
                player.play(client.channel.hi);
                stream_mode = 'ogg';
                $.Storage.set('stream_mode', stream_mode);
                return false;
            }
        }

    });
    $('#console .streamcontrol .links .mp3').click(function(e) {
        if (stream_mode != 'mp3') {
            if (player.canplay('audio/mpeg')) {
                e.preventDefault();
                $('#console .streamcontrol .links').children().removeClass('blured');
                $('#console .streamcontrol .links .ogg').addClass('blured');
                player.play(client.channel.low);
                stream_mode = 'mp3';
                $.Storage.set('stream_mode', stream_mode);
                return false;
            }

        }
    });
    var list = $('#playlist .list');
    list.html('');
    var t = 0;
    var addtr = function() {
        var fin = false;
        for (var dt = t; dt < t + 1; dt++) {
            if (dt < data.pls.length) {
                addtrack(data.pls[dt]);
            } else {
                if (list.height() < $('#playlist .inner').height()) {
                    $('#playlist .list .advice').remove();
                    list.append('<li class="advice">' + locale.ttupload + '</li>');
                } else {
                    $('#playlist .list .advice').remove();
                }
                fin = true;
                break;
            }
        }
        t = dt;
        if (!fin) {
            setTimeout(addtr, 50);
        }
    }
    addtr();

    updatetimes();
    if (client.user && location.hash == '#!/chat/') {
        $('#info .tabs .chat').trigger('click');
    }
    if (data.changed) {
        var startplay = $.Storage.get("play");
        if (startplay == 't' +
            'rue') {
            if (stream_mode == 'ogg') {
                player.play(client.channel.hi);
            } else {
                player.play(client.channel.low);
            }
            $.Storage.set("play", 'false');
            $('#console .streamcontrol .play').click();
        }
    }
    newTagline();
    $(window).trigger('hashchange');

    var rc = $.Storage.get("greating");
    if (rc != '1') {
        //readGreating();
    }

}

function parser() {
    path = window.location.host.split('.');
    if (path[1] == 'trigger') {
        channel = path[0];
        channelid = 1;
        if (welcomedata.channels) {
            for (ch in welcomedata.channels) {
                if (channel == welcomedata.channels[ch].name) {
                    channelid = welcomedata.channels[ch].id;
                    client.goChannel(channelid, onChannel);
                }
            }
        }
    }
}


function processLogin(data) {
    if (data.user) {
        newTagline();
        $('.loginform').hide(400);
        $('.goin').hide();
        $('.submit_box').show(400);
        $('#info .tabs .chat').show();
        $('#info .tabs .profile').show();
        $('#console .upfiles').show();
    } else {
        if (data.error) {
            $('.loginform .alert').html(data.error);
        }
    }
    var ch = $.Storage.get("channel");
    path = window.location.host.split('.');
    if (path[1] == 'trigger') {
        parser()
    } else {
        if (ch) {
            client.goChannel(parseInt(ch), onChannel);
        } else {
            client.goChannel(1, onChannel);
        }
    }
}

function goLogin() {
    $('.loginform .alert').html('');
    if (recovery) {
        var mail = $('#lgname').val();
        if (mail.length > 3) {
            client.recover(mail, function(data) {
                if (data.ok) {
                    $('.loginform .alert').html(data.m);
                } else {
                    if (data.e == 'no user') {
                        $('.loginform .alert').html('С таким почтовым ящиком ни кто не регистрировался (');
                    } else {
                        $('.loginform .alert').html(data.e);
                    }
                }
            });
        } else {
            $('.loginform .alert').html('Я не смогу восстановить пароль без адреса почтового ящика');
        }
    } else {
        var name = $('#lgname').val(),
            pass = $('#lgpass').val();
        if (name.length > 0 && pass.length > 0) {
            pass = hex_md5(pass);
            if (remember_name) {
                $.Storage.set("username", name);
                $.Storage.set("password", pass);
            } else {
                $.Storage.set("username", '');
                $.Storage.set("password", '');
            }
            client.login(name, pass, processLogin);
        }
    }
}


function setCurrent(track) {

    var cur = $('#playlist .current').html('');
    var base = $('<div class="base"></div>').appendTo(cur);
    var src = track.src;
    if (!src) {
        src = "img/nocover.png"
    }
    var fastag = ''
    if (track.tg.length > 0) {
        fastag = '<div class="tag">' + track.tg[0].n + '</div>';
    }
    if (track.tg.length > 1) {
        fastag += '...';
    }
    var titleURI = track.t.replace('amp;', '');
    var artistURI = track.a.replace('amp;', '');
    var newHeader = artistURI + ' - ' + titleURI + ' @ Trigger';

    document.title = newHeader;
    base.append('<table><tr><td class="cover"><div class="artwork"><img src="' + src + '"></div></td><td class="name"><span class="artist">' + track.a + '</span><span style="position: absolute; top: -50px;"> - </span><br><span class="title">' + track.t + '</span></td><td class="fastag"><div class="intag">' + fastag +
        '</div></td><td class="rating"><table><tr><td><div class="down but"></div></td><td><div class="curnum">' + track.r + '</div></td><td><div class="up but"></div></td></tr></table></td></tr></table>');
    var up = $(base).find('.rating .up');
    var down = $(base).find('.rating .down');


    $(up).click(function(e) {
        if (vote > 0) {
            client.addvote({'id': track.id, 'v': 0});
            vote = 0;
        } else {
            client.addvote({'id': track.id, 'v': client.user.w});
            if (mutetrack) {
                player.mute(false);
            }
            vote = 1;
        }
        e.stopPropagation();

    });
    $(down).click(function(e) {
        if (vote < 0) {
            client.addvote({'id': track.id, 'v': 0});
            if (mutetrack) {
                player.mute(false);
            }
            vote = 0;
        } else {
            client.addvote({'id': track.id, 'v': -client.user.w});
            if (mutetrack) {
                player.mute(true);
            }
            vote = -1;
        }
        e.stopPropagation();
    });


    var inf = track.i;
    if ((track.p.length / client.channel.a) > 0.8 && client.channel.a > 9 && track.n.length < 3) {
        $('#playlist .current .artwork').css('border', '2px solid #ffcd00');
    } else {
        $('#playlist .current .artwork').css('border', '1px solid #aaa');
    }
    if (track.n.length>0 && track.n[0].n=='trigger'){
        $('#playlist .current .artwork').css('border', '2px solid #ffcd00');
    }
    cur.attr('trackid', track.id);
    var vote = 0;
    if (client.user) {
        for (var vr in track.p) {
            if (track.p[vr].vid == client.user.id) {
                base.find('.rating div').css('color', '#ffae00');
                vote = 1;
                break;
            }
        }
        for (var vr in track.n) {
            if (track.n[vr].vid == client.user.id) {
                base.find('.rating div').css('color', 'red');
                vote = -1;
                break;
            }
        }
    }
    var cankill = 0;
    var full = $('<div class="full"></div>').appendTo(cur);
    if (client.user) {
        if (client.user.id == track.sid || client.user.id == 1) {
            cankill += 1;
        }
        if (client.user.prch || client.user.opch) {
            if (client.user.prch == client.channel.chid || client.user.opch == client.channel.chid) {
                cankill += 1;
            }
        }
    }


    //Генерируем таблицу
    var table = $('<table cellpadding="0" cellspacing="0" border="0"></table>').appendTo(full);
    var tbody = $('<tbody></tbody>').appendTo(table);
    var tr = $('<tr></tr>').appendTo(tbody);
    var col_left = $('<td class="l-col"></td>').appendTo(tr);
    var col_right = $('<td class="r-col"></td>').appendTo(tr);

    //Заполняем таблицу блоками
    var tags = $('<div class="tags"></div>').appendTo(col_right);

    //Контейнер списка тегов
    if (track.tg.length > 0) {
        var tags_list = $('<div class="tags_list"></div>').appendTo(tags);
    }

    //Контейнер списка ссылок
    var track_links = $('<div class="track_links"></div>').appendTo(tags);

    //Описание трека если есть
    if (inf != '') {
        var info = $('<div class="info">' + inf + '</div>').appendTo(col_right);
    }

    var voting = $('<div class="votebar"></div>').appendTo(col_right);
    var voters = $('<div class="voters"><ul class="nvotes"></ul><ul class="pvotes"></ul></div>').appendTo(voting);

    //Автор трека
    col_right.append('<div class="sender">прнс <a href="javascript:getuser(' + track.sid + ');void(0);">' + track.s + '</a></div>');
    if (inf == '') {
        $(".sender").css('padding-top', '0');
    }

    //Заполнение тегов
    for (var t in track.tg) {
        var tagitem = $('<div class="tag">' + track.tg[t].n + '</div>').appendTo(tags_list);
        tagitem.attr('tagid', track.tg[t].id);
    }

    //Удаление трека
    if (cankill > 0) {

        var kill = $('<div class="kill"><img width="18" height="18" src="/img/kill.png"></div>').appendTo(col_left);

        if (track.tg.length == 0) {
            $(kill).css('top', '6px');
        }

        kill.click(function() {
            client.killtrack(track.id);
        });
    }
    var titleURI = encodeURIComponent(track.t).replace('amp%3B', '');
    var artistURI = encodeURIComponent(track.a).replace('amp%3B', '');
    cur.append('<div class="timer"><div class="cursor"></div></div>');
    $('<span><a href="http://vk.com/audio?q=' + artistURI + ' - ' + titleURI + '" target="_blank">>vk</a></span>').appendTo(track_links);
    $('<span><a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(track.a) + ' - ' + encodeURIComponent(track.t) + '" target="_blank">>youtube</a></span>').appendTo(track_links);
    $('<span><a href="https://play.google.com/music/listen?u=0#/sr/' + encodeURIComponent(track.a) + ' - ' + encodeURIComponent(track.t) + '" target="_blank">>googlemusic</a></span>').appendTo(track_links);
    $('<span><a href="javascript:addTr(' + track.id + ');void(0);">>в чат</a></span>').appendTo(track_links);

    full.hide();

    base.click(function() {
        $('.intag').css('display', 'block');
        $('#playlist .item .full').hide(400);
        track = client.channel.current;
        var positivelist = $(voters).find(".pvotes").html('');
        var negativelist = $(voters).find(".nvotes").html('');
        for (var i in track.n) {
            $('<li><a href="javascript:getuser(' + track.n[i].vid + ');void(0);">' + track.n[i].n + '</a></li>').appendTo(negativelist);
        }
        for (var i in track.p) {
            $('<li><a href="javascript:getuser(' + track.p[i].vid + ');void(0);">' + track.p[i].n + '</a></li>').appendTo(positivelist);
        }


        if (!$(this).hasClass('expanded')) {
            $(this).find('.intag').css('display', 'none');
            $(this).addClass('expanded');
        } else {
            $(this).find('.intag').css('display', 'block');
            $(this).removeClass('expanded');
        }
        full.toggle({step: onresize});
    });
    onresize();
}

function logout() {
    $('#info .content').hide();
    $.Storage.remove('username');
    $.Storage.remove('password');
    $('.loginform').show(400);
    $('.submit_box').hide(400);
    $('#info .tabs .chat').hide();
    $('#info .tabs .profile').hide();
    $('#console .upfiles').hide();
    $('#console .userinfo').hide();
    showControlPanel();
    client.logout(function() {

    });
}


function removetrack(trackid) {
    $('#playlist .list .trackid' + trackid).hide('slow', function() {
        this.remove();
    });
}
function addtrack(track) {
    var item = $('<li class="item"></li>');
    var base = $('<div class="base"></div>').appendTo(item);

    var fastag = ''
    if (track.tg.length > 0) {
        fastag = '<div class="tag">' + track.tg[0].n + '</div>';
    }
    if (track.tg.length > 1) {
        fastag += '...';
    }
    var src = track.co;

    if (!src) {
        src = "img/nocover.png"
    }
    base.append('<table><tr><td class="cover"><div class="artwork"><img src='+src+'></div></td><td class="name"><div class="artist">' + track.a + '</div><div class="title">' + track.t + '</div></td><td class="fastag"><div class="intag">' + fastag + '</div></td><td class="time"></td><td class="rating"><div class="ratingdiv">' + track.r + '</div></td></tr></table>');

    var trackartist = base.find('.artist');
    var tracktitle = base.find('.title');
    var artwork=base.find('.artwork');
    if (track.n.length>0 && track.n[0].n=='trigger'){
        artwork.css('border', '2px solid #ffcd00');
    }
    if (client.user) {
        if (track.sid == client.user.id) {
            item.addClass('my');
        }
        if (track.sid == client.user.id || client.user.prch == client.channel.chid || client.user.opch == client.channel.chid) {

            var ontitleblur = function() {
                if (track.a != trackartist.text() || track.t != tracktitle.text()) {
                    if (trackartist.text().length > 0 && tracktitle.text().length > 0) {
                        track.a = trackartist.text();
                        track.t = tracktitle.text();
                        client.updateTrack(track);
                    }
                }
            }
            trackartist.attr('contentEditable', true);
            tracktitle.attr('contentEditable', true);
            trackartist.blur(ontitleblur);
            tracktitle.blur(ontitleblur);
        }
    }
    var rating = $(base).children('.rating').children()[0];
    var ratingdiv = base.find('.ratingdiv');

    var inf = track.i;
    var full = $('<div class="full"></div>').appendTo(item);
    full.attr('id', track.id);
    var cankill = 0;
    if (client.user) {
        if (client.user.id == track.sid || client.user.id == 1) {
            cankill += 1;
        }
        if (client.user.prch || client.user.opch) {
            if (client.user.prch == client.channel.chid || client.user.opch == client.channel.chid) {
                cankill += 1;
            }
        }
    }
//Генерируем таблицу
    var table = $('<table cellpadding="0" cellspacing="0" border="0"></table>').appendTo(full);
    var tbody = $('<tbody></tbody>').appendTo(table);
    var tr = $('<tr></tr>').appendTo(tbody);
    var col_left = $('<td class="l-col"></td>').appendTo(tr);
    var col_right = $('<td class="r-col"></td>').appendTo(tr);

    var voting = $('<div class="votebar"></div>').appendTo(col_right);
    var tags = $('<div class="tags"></div>').appendTo(col_right);

    if (track.tg.length > 0) {
        var tags_list = $('<div class="tags_list"></div>').appendTo(tags);
    }

    var track_links = $('<div class="track_links"></div>').appendTo(tags);

//Описание трека если есть
    if (inf != '') {
        var info = $('<div class="info">' + inf + '</div>').appendTo(col_right);
    }

//Автор трека
    if (track.ut) {
        //  var trackuploadtime = track.ut.format("HH:MM");
    }

    col_right.append('<div class="sender">прнс <a href="javascript:getuser(' + track.sid + ');void(0);">' + track.s + '</a> <span class="howold"></span></div>');
    if (inf == '') {
        $(".sender").css('padding-top', '0');
    }

//Заполнение тегов
    for (var t in track.tg) {
        var tagitem = $('<div class="tag">' + track.tg[t].n + '</div>').appendTo(tags_list);
        tagitem.attr('tagid', track.tg[t].id);
    }

//Удаление трека
    if (cankill > 0) {

        var kill = $('<div class="kill"><img width="18" height="18" src="/img/kill.png"></div>').appendTo(col_left);

        if (track.tg.length == 0) {
            $(kill).css('top', '6px');
        }

        kill.click(function() {
            client.killtrack(track.id);
        });
    }
    var titleURI = encodeURIComponent(track.t).replace('amp%3B', '');
    var artistURI = encodeURIComponent(track.a).replace('amp%3B', '');

//блок ссылок

    $('<span><a href="http://vk.com/audio?q=' + artistURI + ' - ' + titleURI + '" target="_blank">>vk</a></span>').appendTo(track_links);
    $('<span><a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(track.a) + ' - ' + encodeURIComponent(track.t) + '" target="_blank">>youtube</a></span>').appendTo(track_links);
    $('<span><a href="https://play.google.com/music/listen?u=0#/sr/' + encodeURIComponent(track.a) + ' - ' + encodeURIComponent(track.t) + '" target="_blank">>googlemusic</a></span>').appendTo(track_links);
    $('<span><a href="javascript:addTr(' + track.id + ');void(0);">>в чат</a></span>').appendTo(track_links);



    full.hide();
    item.attr('id', track.id);
    item.attr('rating', track.r);
    item.attr('at', track.at);
    item.addClass('trackid' + track.id);
    var vote = 0;
    if (client.user) {
        for (var vr in track.p) {Живописная ул., 27 строение 13, Москва, 123098
            if (track.p[vr].vid == client.user.id) {
                base.find('.rating div').css('color', '#ffae00');
                vote = 1;
                break;
            }
        }
        for (var vr in track.n) {
            if (track.n[vr].vid == client.user.id) {
                if (track.current) {
                    base.find('.rating div').css('color', 'red');
                } else {
                    base.find('.rating div').css('color', '#000000');
                }
                vote = -1;
                break;
            }
        }
    }


    base.click(function() {
        $('.intag').css('display', 'block');
        var curentbase = $('#playlist .current .base');
        var curentexpanded = curentbase.hasClass('expanded');
        if (curentexpanded) {
            $('#playlist .current .base').removeClass('expanded');
            $('#playlist .current .full').hide(400);
        }
        $('#playlist .item').each(function() {
            var b = $(this).children('.base');
            var f = $(this).children('.full');
            if ($(this).attr('id') != item.attr('id')) {
                $(f).hide(400);
                $(b).removeClass('expanded');

            }
        });


        if (!$(this).hasClass('expanded')) {
            $(this).find('.intag').css('display', 'none');
            $(this).addClass('expanded');
        } else {
            $(this).find('.intag').css('display', 'block');
            $(this).removeClass('expanded');
        }

        if ($(this).hasClass('expanded') && client.user) {
            $(voting).html('');
            var down = $('<div class="down but"></div>').appendTo(voting);
            var negative = $('<div class="negative but"></div>').appendTo(voting);
            var numb = $('<div class="numb">' + client.track(track.id).vote + '</div>').appendTo(voting);
            var positive = $('<div class="positive but"></div>').appendTo(voting);
            var up = $('<div class="up but"></div>').appendTo(voting);

            var voters = $('<div class="voters"><ul class="nvotes"></ul><ul class="pvotes"></ul></div>').appendTo(voting);
            var positivelist = $(voters).find(".pvotes");
            var negativelist = $(voters).find(".nvotes");
            for (var t in client.channel.pls) {
                if (client.channel.pls[t].id == track.id) {
                    track = client.channel.pls[t];
                    break;
                }
            }
            for (var i in track.n) {
                $('<li><a href="javascript:getuser(' + track.n[i].vid + ');void(0);">' + track.n[i].n + '</a></li>').appendTo(negativelist);
            }
            for (var i in track.p) {
                $('<li><a href="javascript:getuser(' + track.p[i].vid + ');void(0);">' + track.p[i].n + '</a></li>').appendTo(positivelist);
            }

            $(up).click(function() {
                if (vote > 0) {
                    client.addvote({'id': track.id, 'v': 0});
                    vote = 0;
                } else {
                    client.addvote({'id': track.id, 'v': client.user.w});
                    vote = 1;
                }
            });

            $(down).click(function() {
                if (vote < 0) {
                    client.addvote({'id': track.id, 'v': 0});
                    vote = 0;
                } else {
                    client.addvote({'id': track.id, 'v': -client.user.w});
                    vote = -1;
                }
            });

            $(positive).click(function() {
                var vote = client.track(track.id).vote + 1;
                client.addvote({'id': track.id, 'v': vote});

            });
            $(negative).click(function() {
                var vote = client.track(track.id).vote - 1;
                client.addvote({'id': track.id, 'v': vote});
            });
        }
        if (curentexpanded) {
            full.toggle({step: onresize});
        } else {
            full.toggle(400);
            if ($(this).hasClass('expanded')) {
                var uptext = moment(track.ut).subtract(3, 'hour').from();
                full.find('.howold').html(uptext);
            }
        }
    });
    base.hover(function(ein) {
        $(this).addClass('tru');
        updatetimes();
    }, function(eout) {
        $(this).removeClass('tru');
        updatetimes();
    });
    item.appendTo($('#playlist .list'));
    sortTracks();
}

function opentrack(track) {
    var id = track.id;
    var item = null
    if (client.channel.current.id == id) {
        item = $('#playlist .current');
        item.css('background', '#ffcd00');
        item.animate({backgroundColor: '#333'}, 1000);
    }
    if ($('#playlist .list .trackid' + id).length > 0) {
        item = $('#playlist .list .trackid' + id);
        item.addClass('hiligth');
        setTimeout(function(item) {
            item.removeClass('hiligth')
        }, 100, item);
        $('.inner').animate({scrollTop: item[0].offsetTop - item.children('.full').height()}, 1200);
    }
    if (item) {
        var base = item.children('.base');
        if (!$(base).hasClass('expanded')) {
            base.trigger('click');
        }
    } else {
        if (track.tl) {
            showHistory(false, false, new Date(Date.parse(track.tl) + 10800000 + 12000));
        }
    }


}

function updateTrack(track) {
    var item = null
    if (track.current) {
        item = $('#playlist .current');
        if ((track.p.length / client.channel.a) > 0.8 && client.channel.a > 9 && track.n.length < 3) {
            $('#playlist .current .artwork').css('border', '2px solid #ffcd00');
        } else {
            $('#playlist .current .artwork').css('border', '1px solid #aaa');
        }
    } else {
        item = $('#playlist .list .trackid' + track.id);
    }
    if (track.current) {
        item.find('.rating .curnum').html(track.r);
    } else {
        item.find('.rating').html('<div>' + track.r + '</div>');
    }
    item.find('.artist').html(track.a);
    item.find('.title').html(track.t);
    item.attr('rating', track.r);
    item.attr('vote', track.vote);
    item.find('.numb').html(track.vote)

    if (track.n.length>0 && track.n[0].n=='trigger'){
        item.find('.atrwork').css('border', '2px solid #ffcd00');
    }
    var positivelist = item.find(".pvotes").html('');
    var negativelist = item.find(".nvotes").html('');
    for (var i in track.n) {
        $('<li><a href="javascript:getuser(' + track.n[i].vid + ');void(0);">' + track.n[i].n + '</a></li>').appendTo(negativelist);
    }
    for (var i in track.p) {
        $('<li><a href="javascript:getuser(' + track.p[i].vid + ');void(0);">' + track.p[i].n + '</a></li>').appendTo(positivelist);
    }
    item.find('.rating div').css('color', '#bbb');
    if (client.user) {
        for (var vr in track.p) {
            if (track.p[vr].vid == client.user.id) {
                if (track.current) {
                    item.find('.rating .curnum').css('color', '#ffae00');
                } else {
                    item.find('.rating div').css('color', '#ffae00');
                }
                break;
            }
        }
        for (var vr in track.n) {
            if (track.n[vr].vid == client.user.id) {
                if (track.current) {
                    item.find('.rating .curnum').css('color', 'red');
                } else {
                    item.find('.rating div').css('color', '#000000');
                }
                break;
            }
        }
    }
    sortTracks();
}

function sf(a, b) {
    var dif = $(b).attr('rating') - $(a).attr('rating');
    if (dif != 0) {
        return dif;
    } else {
        var atime = new Date($(a).attr('at'));
        var btime = new Date($(b).attr('at'));
        return atime - btime;
    }
}

function sortTracks() {
    $('#playlist .item').sort(sf).appendTo('#playlist .list');
    var list = $('#playlist .list');
    if (client.user) {
        if (list.height() < $('#playlist .inner').height()) {
            $('#playlist .list .advice').remove();
            list.append('<li class="advice">Самое время нести!</li>');
        } else {
            $('#playlist .list .advice').remove();
        }
    }
}

function setcurtime(fast) {
    if (client.channel.current) {
        if (!fast) {
            $('#playlist .current .timer .cursor').animate({width: client.channel.ct / client.channel.current.tt * $('#playlist .current .timer').width()}, 500);
        } else {
            $('#playlist .current .timer .cursor').css({'width': client.channel.ct / client.channel.current.tt * $('#playlist .current .timer').width()});
        }
    }
}

function isElementInViewport(el) {

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }
    if (el) {
        var rect = el.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
        );
    } else {
        return false;
    }
}

function updatetimes() {
    var offset = 0;
    if (client.channel.current) {
        offset = client.channel.current.tt - client.channel.ct;
    }
    for (var t in client.channel.pls) {
        var item = $('#' + client.channel.pls[t].id + ' .base');
        if (isElementInViewport(item)) {
            if (!item.hasClass('tru')) {
                $('#' + client.channel.pls[t].id + ' .time').html("+" + secToTime(offset));
            } else {
                $('#' + client.channel.pls[t].id + ' .time').html(secToTime(client.channel.pls[t].tt));
            }
        }
        offset += client.channel.pls[t].tt;
    }
}

function secToTime(time) {
    var hour = Math.floor(time / 3600);
    var m = Math.floor(time / 60);
    if (hour > 0) {
        m -= hour * 60;
    }
    var min = (m < 10) ? "0" + m : m;
    var sec = (Math.floor(time % 60) < 10) ? "0" + Math.floor(time % 60) : Math.floor(time % 60);
    if (hour > 0) {
        return hour + ':' + min + ':' + sec;
    } else {
        return min + ':' + sec;
    }

}

function goDonate() {
    var constitution = $('<div id="con"><div id="coninside"></div></div>').appendTo('#content');
    $('#con').css('left', $('#console').css('width'));
    $('#con').css('width', $('#content').css('width') - $('#console').css('width'));

    var jqxhr = $.get("/donate.html", function(data) {
        data += '<div id="ender"></div>';
        $('#coninside').html(data);
        $('<button>X</button>').prependTo('#ender').click(function() {
            $.Storage.set("greating", '1')
            constitution.html('');
        });

    });

}

function readGreating() {
    var constitution = $('<div id="con"><div id="coninside"></div></div>').appendTo('#content');
    $('#con').css('left', $('#console').css('width'));
    $('#con').css('width', $('#content').css('width') - $('#console').css('width'));

    var xhr = $.get("/greating.html", function(data) {
        data += '<div id="ender"></div>';
        $('#coninside').html(data);
        $('<button>Ясно понятно</button>').appendTo('#ender').click(function() {
            $.Storage.set("greating", '1')
            constitution.html('');
        });

    });

}
function showFail() {
    var constitution = $('<div id="con"><div id="coninside"></div></div>').appendTo('#content');
    $('#con').css('left', $('#console').css('width'));
    $('#con').css('width', $('#content').css('width') - $('#console').css('width'));

    var xhr = $.get("/fail.html", function(data) {
        data += '<div id="ender"></div>';
        $('#coninside').html(data);
        $('<button>Ясно понятно</button>').appendTo('#ender').click(function() {
            $.Storage.set("greating", '1')
            constitution.html('');
        });

    });

}


var sectrack = setInterval(function() {
    if (messages.length) {
        now = new Date().getTime();
        for (var a = messages.length; a > 0; a--) {
            if (messages.length > a) {
                if (isElementInViewport(messages[a])) {
                    updateMT(messages[a]);
                }
            }
        }
    }
}, 5000);

$.fn.selectRange = function(start, end) {
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};


