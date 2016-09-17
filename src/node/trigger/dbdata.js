var db = require('./db.local.js');
var user = require('./user.js');
var exec = require("child_process").exec;
var md5 = require('MD5');
var sanitizer = require('sanitizer');
var fs = require("fs");

var mailgun = require('mailgun').Mailgun;
var mg = new mailgun('key-2b447e23ffd7065991bfe780bcf1c1cf');

var voteq = [];
var uvoteq = [];

var vprocess = false;
var uvprocess = false;


var searchCaseState = 0;


function nmTokenPolicy(nmTokens) {
    if ("specialtoken" === nmTokens) {
        return nmTokens;
    }
    if (/[^a-z\t\n\r ]/i.test(nmTokens)) {
        return null;
    } else {
        return nmTokens.replace(
            /([^\t\n\r ]+)([\t\n\r ]+|$)/g,
            function(_, id, spaces) {
                return 'p-' + id + (spaces ? ' ' : '');
            });
    }
}


function uriPolicy(value, effects, ltype, hints) {
    return value;
}

function strip_tags(str) {	// Strip HTML and PHP tags from a string
    return str.replace(/<\/?[^>]+>/gi, '');
}


exports.updatelimits = function(userid, callback) {
    var data = {};
    var q2 = "select tracks.date, tracks.time, tracks.gold from tracks where tracks.submiter = " + userid + " and tracks.channel=1 and tracks.unlim=0 and tracks.date BETWEEN NOW() - INTERVAL 12 HOUR AND NOW()"

    var q = "SELECT SUM(tracks.time) as sum," +
        "(select tracks.date from tracks where tracks.submiter = " + userid + " and tracks.channel=1 and tracks.unlim=0 and tracks.date BETWEEN NOW() - INTERVAL 12 HOUR AND NOW() limit 0,1) as lastime, " +
        "(Select SUM(tracks.time) FROM `tracks` WHERE tracks.submiter = " + userid + " and tracks.channel=1 and tracks.gold=1 and tracks.date BETWEEN NOW() - INTERVAL 12 HOUR AND NOW()) as goldsum " +
        "FROM `tracks` WHERE tracks.submiter =" + userid + " and tracks.channel=1 and tracks.unlim=0 and tracks.date BETWEEN NOW() - INTERVAL 12 HOUR AND NOW()";
    db.connection.query(q, function(error, result, fields) {
        if (!error) {
            data.time = result[0].sum || 0;
            var goldtime = result[0].goldsum || 0;
            data.time = data.time - goldtime * 2;
            var last = new Date(result[0].lastime);
            if (Date.parse(last) > 0) {
                var now = new Date();
                var shift = new Date((Date.parse(last) + 1000 + (3600 * 12 * 1000)) - Date.parse(now));
                data.next = Date.parse(shift);
            } else {
                data.next = 0;
            }

            callback(data);
        } else {
            callback({'error': error});
        }
    });
    //data.next=0;
    //data.time=0;
    //callback(data);

    /*
     db.connection.query(q2, function(error, result, fields) {
     if (!error) {
     overal = 0;
     lastdate = 0;
     for (var c in result) {
     overal += result[c].time;
     if (result[c].gold[0] == 1) {
     overal -= result[c].time;
     }
     lastdate = result[c].date
     }
     data.time = overal
     var last = new Date(lastdate);
     if (Date.parse(last) > 0) {
     var now = new Date();
     var shift = new Date((Date.parse(last) + 1000 + (3600 * 12 * 1000)) - Date.parse(now));
     data.next = Date.parse(shift);
     } else {
     data.next = 0;
     }
     callback(data);
     } else {
     callback({'error': error});
     }
     });*/
}


function getinvites(id, callback) {
    db.connection.query('SELECT invites.*, users.name FROM invites LEFT JOIN users ON invites.userid=users.id WHERE parentid = ' + id, function(e, result, fields) {
        var invites = {u: [], i: []};
        if (!e) {

            for (var i in result) {
                var invite = {
                    c: result[i].code
                }
                if (new Date(result[i].send_time).getTime() < 0) {
                    invites.i.push(result[i].code);
                } else {
                    if (new Date(result[i].activated_time).getTime() > 0) {
                        invites.u.push({
                            id: result[i].userid,
                            n: result[i].name
                        });
                    }
                }
            }
            db.connection.query('SELECT users.id, users.name FROM users WHERE users.id IN (SELECT invites.parentid from invites where userid=' + id + ');', function(err, r, f) {
                if (!err) {
                    if (r[0]) {
                        invites.p = r[0];
                    }
                }
                callback(invites);
            });

        } else {
            callback(invites);
        }
    });
}

exports.getInvites = function(id, callback) {
    getinvites(id, callback);
}

function getUser(id, callback) {
    db.connection.query('SELECT * FROM users WHERE id = ' + id, function(e, result, fields) {
        if (!e) {
            if (result[0]) {
                var dbrec = result[0];
                var qu = 'SELECT voterid, value, users.name  FROM uservote LEFT JOIN users ON uservote.voterid=users.id WHERE userid=' + dbrec.id;// + ' AND users.lastseen BETWEEN NOW() - INTERVAL 7 DAY AND NOW()';
                db.connection.query(qu, function(error, res, fields) {
                    if (!error) {
                        var us = user.newUser({
                            name: dbrec.name,
                            pass: dbrec.password,
                            id: dbrec.id,
                            country: dbrec.country,
                            city: dbrec.city,
                            info: dbrec.info,
                            picture: dbrec.picture,
                            rank: dbrec.rank,
                            regdate: dbrec.regdate,
                            email: dbrec.email,
                            gender: dbrec.gender[0] == 1,
                            votes: res
                        });
                        callback({'user': us});
                    } else {
                        callback({'error': 'database fail'});
                    }
                });

            } else {
                callback({'error': 'nouser'});
            }
        } else {
            callback({'error': 'database fail'});
        }
    });
}
exports.getuser = function(id, callback) {
    getUser(id, callback);
}

exports.getstats = function(userid, callback) {
    /*db.connection.query('SELECT count(*) as "count" FROM tracks WHERE tracks.submiter=' + userid + ' AND tracks.date BETWEEN NOW() - INTERVAL 7 DAY AND NOW()', function(e, r, fields) {
     var count = r[0].count;
     db.connection.query('select sum(trackvote.value) as "rating" FROM trackvote where trackvote.trackid in (SELECT tracks.id FROM tracks WHERE tracks.submiter=' + userid + ' AND tracks.date BETWEEN NOW() - INTERVAL 7 DAY AND NOW()) AND trackvote.voterid <> ' + userid + ';', function(e, result, fields) {
     var rating = result[0].rating;
     callback({trx: count, rt: (rating / count).toFixed(3)});
     });
     });*/
    callback({trx: 0, rt: 0});
}


exports.login = function(data, callback) {
    var username = sanitizer.escape(data.u);
    var password = sanitizer.escape(data.p);
    db.connection.query('SELECT * FROM users WHERE name = \'' + username + '\'', function(e, result, fields) {
        if (!e) {
            if (result[0]) {
                var dbrec = result[0];
                if (dbrec.password == password) {
                    getUser(dbrec.id, callback);
                    if (data.ip) {
                        var datequery = 'UPDATE users SET lastseen = NOW(), ip= "' + data.ip + '" WHERE id =' + dbrec.id;
                        db.connection.query(datequery, function(re, qresult, qfields) {
                            //newip
                        });
                    }
                } else {
                    callback({'error': 'wrongpass'});
                }
            } else {
                callback({'error': 'nouser'});
            }
        } else {
            callback({'error': 'database fail'});
        }
    });
}


exports.addMessage = function(message) {
    var q = 'INSERT INTO chat (channelid, userid, message,trackid) VALUES (' + message.chid + ',' + message.uid + ',\'' + message.m + '\',' + message.tid + ')';
    db.connection.query(q, function(e, result, fields) {
        if (e) {
        }
    });

}

exports.getMessages = function(id, shift, callback) {
    var q = 'SELECT chat.*, users.name FROM chat LEFT JOIN users ON chat.userid=users.id WHERE date < ' + db.connection.escape(shift) + ' AND channelid=' + id + ' ORDER BY date DESC LIMIT 50';
    db.connection.query(q, function(e, result, fields) {
        var data = [];
        for (var m in result) {
            var mes = result[m];
            data.unshift({
                chid: mes.channelid,
                uid: mes.userid,
                uname: mes.name,
                m: mes.message,
                t: mes.date,
                tid: mes.trackid
            })
        }
        callback(data)
    });

}

var historyStack = [];

function getTracksFromQery(qq, callback, dt) {
    db.connection.query(qq, function(error, result, fields) {
        if (!error) {
            var ids = '';
            var tracks = [];
            for (var t in result) {
                tracks.push({
                    a: result[t].artist.replace('&amp;', '&'),
                    t: result[t].title.replace('&amp;', '&'),
                    i: result[t].info,
                    tt: result[t].playdate,
                    s: result[t].name,
                    p: [],
                    n: [],
                    tg: [],
                    id: result[t].id,
                    chid: result[t].channel,
                    sid: result[t].submiter,
                    g: result[t].gold > 0,
                    r: 0
                });
                ids += result[t].id + ',';
            }
            ids = ids.slice(0, -1);
            var q = 'SELECT trackvote.*, users.name FROM trackvote LEFT JOIN users ON trackvote.voterid=users.id WHERE trackid in (' + ids + ')';
            db.connection.query(q, function(error, result, fields) {
                if (!error) {
                    for (var v in result) {
                        for (var t in tracks) {
                            if (result[v].trackid == tracks[t].id) {
                                var vote = {
                                    'vid': result[v].voterid,
                                    'n': result[v].name,
                                    'v': result[v].value
                                };
                                if (result[v].value > 0) {
                                    tracks[t].p.push(vote);
                                } else {
                                    tracks[t].n.push(vote);
                                }
                                tracks[t].r += result[v].value;
                                break;
                            }
                        }
                    }
                    var req = 'SELECT tracktags.trackid, tracktags.tagid, tags.name FROM tracktags LEFT JOIN tags ON tracktags.tagid=tags.id WHERE trackid in (' + ids + ')';
                    db.connection.query(req, function(err, res, fields) {
                        if (!err) {
                            for (var v in res) {
                                for (var t in tracks) {
                                    var tag = {
                                        'id': res[v].id,
                                        'n': res[v].name
                                    };
                                    if (res[v].trackid == tracks[t].id) {
                                        tracks[t].tg.push(tag);
                                    }
                                }
                            }
                            if (dt) {
                                if (historyStack.length > 60) {
                                    historyStack.pop();
                                }
                                historyStack.push({'dt': dt, d: tracks});
                            }
                            callback(tracks);
                        }
                    });

                }
            });
        } else {
            console.log(error);
        }
    });

}
exports.getVoted = function(id, shift, positive, callback) {
    var p = '<';
    if (positive) {
        p = '>';
    }
    var q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE tracks.id IN (SELECT trackvote.trackid FROM trackvote WHERE trackvote.voterid=' + id + ' and trackvote.value ' + p + ' 0) AND tracks.submiter!=' + id + ' AND tracks.date < ' + db.connection.escape(shift) + ' ORDER BY tracks.date DESC limit 20';
    getTracksFromQery(q, callback);

}
exports.getuploads = function(id, shift, callback) {
    var q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE tracks.submiter=' + id + ' AND tracks.playdate < ' + db.connection.escape(shift) + ' order by tracks.playdate desc LIMIT 20';
    getTracksFromQery(q, callback);
}

exports.getTracksByShift = function(data, callback) {
    var getgold = '', getartist = '', gettitle = '';
    if (data.gold) {
        getgold = ' AND tracks.gold = 1';
    }
    data.artist = sanitizer.sanitize(data.artist);
    data.title = sanitizer.sanitize(data.title);
    var dt = {artist: data.artist, title: data.title};
    if (data.artist.length) {
        getartist = ' AND tracks.artist LIKE "%' + data.artist + '%"';
    }
    if (data.title.length) {
        gettitle = ' AND tracks.title LIKE "%' + data.title + '%"';
    }
    var q = '';
    if (!data.top) {
        q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE tracks.channel=' + data.channel + ' AND tracks.playdate < ' + db.connection.escape(data.shift) + getgold + getartist + gettitle + ' order by tracks.playdate desc LIMIT 20';
    } else {
        var order = ' ORDER BY tracks.rating DESC, tracks.realrating DESC, tracks.playdate DESC ';
        if (data.votes) {
            order = ' ORDER BY tracks.realrating DESC, tracks.rating DESC, tracks.playdate DESC '
        }
        q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE tracks.channel=' + data.channel + ' AND tracks.playdate BETWEEN NOW() - INTERVAL 7 DAY AND NOW()' + getgold + getartist + gettitle + order + 'LIMIT ' + data.shift + ',20'
    }
    var finded = false;
    for (var i in historyStack) {
        if (dt == i.dt) {
            finded = true;
            console.log('query exist in stack');
            callback(i.d);
            break;
        }
    }
    if (!finded) {
        getTracksFromQery(q, callback, dt);
    }
}
exports.getTracksByRating = function(channel, callback) {
    var getgold = '';
    if (gold) {
        getgold = ' AND tracks.gold = 1';
    }
    var q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE tracks.channel=' + channel + ' AND tracks.playdate > ' + db.connection.escape(shift) + getgold + ' order by tracks.playdate desc LIMIT 20';
    getTracksFromQery(q, callback);
}

exports.getTrackByID = function(id, callback) {
    var q = 'SELECT tracks.* FROM tracks WHERE tracks.id=' + id + ' LIMIT 1';
    db.connection.query(q, function(error, result, fields) {
        if (result.length) {
            var track = {
                a: result[0].artist.replace('&amp;', '&'),
                t: result[0].title.replace('&amp;', '&'),
                id: result[0].id,
                tl: result[0].playdate,
                tt: result[0].time
            }
            callback(track);
        }

    });
}

exports.getChannels = function(callback) {
    var q = 'SELECT channels.*, users.name as prname FROM channels LEFT JOIN users ON channels.prid=users.id';
    db.connection.query(q, function(error, result, fields) {
        if (!error) {
            var q = 'SELECT editors.*, users.name FROM editors LEFT JOIN users ON editors.id=users.id;';
            db.connection.query(q, function(error, r, fields) {
                if (!error) {
                    for (var t in result) {
                        result[t].editors = [];
                        for (var v in r) {
                            if (r[v].chid == result[t].id) {
                                var editor = {
                                    id: r[v].id,
                                    name: r[v].name,
                                    post: r[v].post
                                }
                                result[t].editors.push(editor);
                            }
                        }
                    }
                    var req = 'SELECT banned.*, users.name, killer_user.name as killername FROM banned LEFT JOIN users ON banned.id=users.id LEFT JOIN users AS killer_user ON banned.killerid=killer_user.id;';
                    db.connection.query(req, function(err, res, fields) {
                        if (!err) {
                            for (var t in result) {
                                result[t].banned = [];
                                for (var v in res) {
                                    if (res[v].chid == result[t].id) {
                                        var ban = {
                                            id: res[v].id,
                                            name: res[v].name,
                                            bantime: res[v].bantime,
                                            killerid: res[v].killerid,
                                            killername: res[v].killername,
                                            reason: res[v].reason
                                        };
                                        result[t].banned.push(ban);
                                    }
                                }
                            }
                            callback(result);
                        }
                    });
                }
            });
        } else {
            console.log(callback({'error': error}));
        }
    });
}
function processUserVote() {
    if (!uvprocess) {
        uvprocess = true;
        if (uvoteq.length > 0) {
            var vote = uvoteq.pop();
            if (vote.v) {
                var q = 'SELECT * FROM uservote WHERE uservote.userid = \'' + vote.id + '\' AND uservote.voterid = \'' + vote.user.id + '\'';
                db.connection.query(q, function(e, result, fields) {
                    if (!e) {
                        if (result.length > 0) {
                            var qq = 'UPDATE uservote SET value = \'' + vote.v + '\' WHERE uservote.userid = \'' + vote.id + '\' AND voterid = \'' + vote.user.id + '\'';
                            db.connection.query(qq, function(e, result, fields) {
                                uvprocess = false;
                                processVote();
                            });
                        } else {
                            var qq = 'INSERT INTO uservote VALUES (\'' + vote.id + '\', \'' + vote.user.id + '\', \'' + vote.v + '\', NULL, NULL)';
                            db.connection.query(qq, function(e, result, fields) {
                                uvprocess = false;
                                processUserVote();
                            });
                        }
                    } else {
                        uvprocess = false;
                        processUserVote();
                    }
                });
            } else {
                var q = 'DELETE FROM uservote WHERE uservote.userid = \'' + vote.id + '\' AND uservote.voterid = \'' + vote.user.id + '\' LIMIT 1';
                db.connection.query(q, function(error, result, fields) {
                    uvprocess = false;
                    processUserVote();
                });
            }
        } else {
            uvprocess = false;
        }
    }

}
function processVote() {
    if (!vprocess) {
        vprocess = true;
        if (voteq.length > 0) {
            var vote = voteq.pop();
            if (vote.v) {
                var q = 'SELECT * FROM trackvote WHERE trackvote.trackid = \'' + vote.id + '\' AND trackvote.voterid = \'' + vote.user.id + '\'';
                db.connection.query(q, function(e, result, fields) {
                    if (!e) {
                        if (result.length > 0) {
                            var qq = 'UPDATE trackvote SET value = \'' + vote.v + '\' WHERE trackvote.trackid = \'' + vote.id + '\' AND voterid = \'' + vote.user.id + '\'';
                            db.connection.query(qq, function(e, result, fields) {
                                vprocess = false;
                                processVote();
                            });
                        } else {
                            var qq = 'INSERT INTO trackvote VALUES (\'' + vote.id + '\', \'' + vote.user.id + '\', \'' + vote.v + '\', NULL, NULL)';
                            db.connection.query(qq, function(e, result, fields) {

                                vprocess = false;
                                processVote();
                            });
                        }
                    } else {
                        vprocess = false;
                        processVote();
                    }
                });
            } else {
                var q = 'DELETE FROM trackvote WHERE trackvote.trackid = \'' + vote.id + '\' AND trackvote.voterid = \'' + vote.user.id + '\' LIMIT 1';
                db.connection.query(q, function(error, result, fields) {
                    vprocess = false;
                    processVote();
                });
            }
        } else {
            vprocess = false;
        }
    }
}

exports.addVote = function(vote) {
    voteq.push(vote);
    processVote();

}
exports.clearVotes = function(track) {
    var q = 'DELETE FROM trackvote WHERE trackvote.trackid = \'' + track.id + '\'  LIMIT 1';
    db.connection.query(q, function(error, result, fields) {
    });
}
exports.addUserVote = function(vote) {
    uvoteq.push(vote);
    processUserVote();

}
exports.updateTrack = function(track) {
    var a = db.connection.escape(track.artist);
    var t = db.connection.escape(track.title);
    var i = sanitizer.sanitize(track.info, uriPolicy, nmTokenPolicy);
    db.connection.query('UPDATE tracks SET artist =' + a + ', title = ' + t + ' info = ' + i + ',  WHERE id = ' + track.id, function(err, result, fields) {
        if (err) {

        } else {
            console.log('track update ok');
        }
    });
}

exports.addTrack = function(track, callback) {
    track.artist = sanitizer.escape(track.artist);
    track.title = sanitizer.escape(track.title);
    track.info = sanitizer.sanitize(track.info, uriPolicy, nmTokenPolicy);
    db.connection.query('INSERT INTO tracks VALUES (NULL, ?, ?, 0, 0, ?, ?, ?, ?, ?, NOW(), NULL,?,NULL,NULL)',
        [track.path,
            track.channel,
            track.artist,
            track.title,
            track.time,
            track.submiter,
            track.info, track.unlim],
        function(err, result) {
            if (!err) {
                track.id = result.insertId;
                var ids = [];
                var tids = [];
                if (track.tags.length) {
                    var q = 'INSERT INTO tracktags (trackid, tagid) VALUES';
                    for (var t in track.tags) {
                        if (t > 0) {
                            q += ','
                        }
                        q += '(' + track.id + ',' + track.tags[t].id + ')';
                    }
                    db.connection.query(q, function(e, result, fields) {
                        callback();
                    });
                } else {
                    callback();
                }
            } else {
                console.log(err);
            }
        }
    );

}
exports.setPlayDate = function(track) {
    var rating = track.positive.length - track.negative.length;

    var q = 'UPDATE tracks SET playdate = DATE_SUB(NOW(), INTERVAL ' + track.time + ' SECOND), rating = ' + track.rating + ' , realrating =' + rating + ' WHERE id =' + track.id;
    db.connection.query(q, function(error, result, fields) {
        if (error) {
            console.log(error);
        }
    });
}
exports.setGold = function(id, goldpath) {
    var q = "UPDATE tracks SET \n gold = " + db.connection.escape(1) + ", \n ondisk = " + db.connection.escape(1) + ",  \n path=" + db.connection.escape(goldpath) + " \n WHERE id =" + db.connection.escape(id);
    db.connection.query(q, function(error, result, fields) {
        if (error) {
            console.log(error);
        }
    });
}
exports.removeTrack = function(id, callback) {
    var q = 'DELETE FROM tracks WHERE id in (' + id + ')';
    db.connection.query(q, function(error, result, fields) {
        if (!error) {
            callback();
        }
    });
}


function getRotationTracks(tids, callback) {
    var ps = '"' + tids.join('","') + '"';
    var searchCase = [];
    searchCase.push(' and DAYOFWEEK(tracks.date) = DAYOFWEEK(NOW()) AND HOUR(tracks.date) between HOUR(NOW()) and HOUR(NOW()+1)');
    searchCase.push(' and HOUR(tracks.date) between HOUR(NOW()) and HOUR(NOW()+1)');
    searchCase.push(' and HOUR(tracks.date) between HOUR(NOW()) and HOUR(NOW()+4)');
    searchCase.push(' and DAYOFWEEK(tracks.date) = DAYOFWEEK(NOW())');
    searchCase.push(' ');
    var q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE tracks.ondisk=1 AND tracks.id not in (' + ps + ')' + searchCase[searchCaseState];

    console.log(q);
    db.connection.query(q, function(error, result, fields) {
        if (!error) {
            if (result.length > 1) {
                var ids = '';
                for (var t in result) {
                    console.log(result[t].path);
                    result[t].positive = [];
                    result[t].negative = [];
                    result[t].tags = [];
                    result[t].rating = 0;
                    result[t].gold = result[t].gold > 0;
                    //   var ar = result[t].path.split('/')
                    //  result[t].path = ar[ar.length - 1];
                    result[t].path = result[t].path.slice(1);
                    ids += result[t].id + ',';
                }

                ids = ids.slice(0, -1);
                var tracks = result;
                var q = 'SELECT trackvote.*, users.name FROM trackvote LEFT JOIN users ON trackvote.voterid=users.id WHERE trackid in (' + ids + ')';
                db.connection.query(q, function(error, result, fields) {
                    if (!error) {
                        for (var v in result) {
                            for (var t in tracks) {
                                if (result[v].trackid == tracks[t].id) {
                                    var vote = {
                                        'voterid': result[v].voterid,
                                        'name': result[v].name,
                                        'value': result[v].value
                                    };
                                    if (result[v].value > 0) {
                                        tracks[t].positive.push(vote);
                                    } else {
                                        tracks[t].negative.push(vote);
                                    }
                                    tracks[t].rating += result[v].value;
                                    break;
                                }
                            }
                        }
                        var req = 'SELECT tracktags.trackid, tracktags.tagid, tags.name FROM tracktags LEFT JOIN tags ON tracktags.tagid=tags.id WHERE trackid in (' + ids + ')';
                        db.connection.query(req, function(err, res, fields) {
                            if (!err) {
                                for (var v in res) {
                                    for (var t in tracks) {
                                        var tag = {
                                            'id': res[v].id,
                                            'n': res[v].name
                                        };
                                        if (res[v].trackid == tracks[t].id) {
                                            tracks[t].tags.push(tag);
                                        }
                                    }
                                }
                                callback(tracks);
                            }
                        });
                    }
                });
            } else {
                if (searchCaseState < searchCase.length - 1) {
                    searchCaseState++;
                    getRotationTracks(tids, callback);
                } else {
                    callback([]);
                }
            }
        } else {
            console.log(error);
            callback([]);
        }
    });
}


exports.getRotation = function(tids, callback) {
    searchCaseState = 0;
    getRotationTracks(tids, callback);

};
exports.setCurrentThreshold = function(chid, threshold) {

    var q = 'UPDATE `channels` SET channels.gold_threshold = ' + db.connection.escape(threshold) + ' WHERE channels.id = ' + db.connection.escape(chid);
    db.connection.query(q, function(error, r, fields) {
        if (!error) {
            console.log('threshold updated');
        } else {
            callback({error: '!!!!!!!!!!!!!update daily gold failed'});
        }
    });
}
exports.getDailyGold = function(chid, callback) {
    var q = 'SELECT count(tracks.id) FROM tracks WHERE tracks.channel=' + db.connection.escape(chid) + ' and tracks.ondisk = 1 and tracks.date BETWEEN NOW() - INTERVAL 24 HOUR AND NOW()';
    db.connection.query(q, function(error, r, fields) {
        if (!error) {
            callback(r);
        } else {
            callback({error: '!!!!!!!!!!!!!getting daily gold failed'});
        }
    });
}

exports.deleteOldTrack = function(chid, callback) {
    var q = 'SELECT tracks.id, tracks.path FROM tracks WHERE tracks.channel=' + db.connection.escape(chid) + ' and tracks.ondisk = 1  ORDER BY tracks.date ASC, tracks.rating ASC LIMIT 1';
    db.connection.query(q, function(error, r, fields) {
        if (!error) {
            callback(r[0]);
            fs.unlink('home/trigger/upload' + r[0].path, function(err) {
                if (err) {
                    console.log(err);
                    callback({error: err});
                }
                console.log('file deleted successfully');
                db.connection.query('UPDATE tracks SET  ondisk=0 WHERE  id = "' + r[0].id + '" LIMIT 1', function(error, result, fields) {
                    callback(r[0]);
                });
            });
        } else {
            callback({error: 'track for deleting not find'});
        }
    });
}

exports.getTracks = function(paths, callback) {
    var ps = '"' + paths.join('","') + '"';
    var q = 'SELECT tracks.*, users.name FROM tracks LEFT JOIN users ON tracks.submiter=users.id WHERE path in (' + ps + ') and tracks.date BETWEEN NOW() - INTERVAL 12 HOUR AND NOW() order by tracks.date desc';
    db.connection.query(q, function(error, result, fields) {
        if (!error) {
            var ids = '';
            for (var t in result) {
                result[t].positive = [];
                result[t].negative = [];
                result[t].tags = [];
                result[t].rating = 0;
                result[t].gold = result[t].gold > 0;
                var ar = result[t].path.split('/')
                result[t].path = ar[ar.length - 1];
                ids += result[t].id + ',';
            }

            ids = ids.slice(0, -1);
            var tracks = result;
            var q = 'SELECT trackvote.*, users.name FROM trackvote LEFT JOIN users ON trackvote.voterid=users.id WHERE trackid in (' + ids + ')';
            db.connection.query(q, function(error, result, fields) {
                if (!error) {
                    for (var v in result) {
                        for (var t in tracks) {
                            if (result[v].trackid == tracks[t].id) {
                                var vote = {
                                    'voterid': result[v].voterid,
                                    'name': result[v].name,
                                    'value': result[v].value
                                };
                                if (result[v].value > 0) {
                                    tracks[t].positive.push(vote);
                                } else {
                                    tracks[t].negative.push(vote);
                                }
                                tracks[t].rating += result[v].value;
                                break;
                            }
                        }
                    }
                    var req = 'SELECT tracktags.trackid, tracktags.tagid, tags.name FROM tracktags LEFT JOIN tags ON tracktags.tagid=tags.id WHERE trackid in (' + ids + ')';
                    db.connection.query(req, function(err, res, fields) {
                        if (!err) {
                            for (var v in res) {
                                for (var t in tracks) {
                                    var tag = {
                                        'id': res[v].id,
                                        'n': res[v].name
                                    };
                                    if (res[v].trackid == tracks[t].id) {
                                        tracks[t].tags.push(tag);
                                    }
                                }
                            }
                            callback(tracks);
                        }
                    });
                }
            });
        }
    });

}

exports.getTags = function(string, callback) {
    var str = strip_tags(string);
    if (str.length != string.length) {
        callback({error: "not valid tag"});
        return;
    }
    string = sanitizer.sanitize(string, uriPolicy, nmTokenPolicy);
    var q = 'SELECT * FROM tags WHERE name LIKE \'%' + string + '%\'';
    db.connection.query(q, function(error, result, fields) {
        if (!error) {
            var data = {t: []}
            for (var r in result) {
                var res = result[r];
                data.t.push({id: res.id, n: res.name});
            }
            callback(data);
        } else {
            callback({error: 'db fail'});
        }
    });

}

exports.getTag = function(string, callback) {
    var str = strip_tags(string);
    if (str.length != string.length) {
        return;
    }
    string = sanitizer.sanitize(string, uriPolicy, nmTokenPolicy);
    var q = 'SELECT * FROM tags WHERE name ="' + string + '"';
    db.connection.query(q, function(error, result, fields) {
        if (!error && result.length > 0) {
            var data = {};
            var res = result[0];
            data.t = {id: res.id, n: res.name};
            callback(data);
        } else {
            callback({error: 'db fail'});

        }
    });

}

exports.addTag = function(string, callback) {
    var str = strip_tags(string);
    if (str.length != string.length) {
        callback({error: "not valid tag"});
        return;
    }
    string = sanitizer.sanitize(string.toLowerCase(), uriPolicy, nmTokenPolicy);
    if (string && string.length > 0) {
        this.getTag(string, function(data) {
            if (data.t) {
                callback({id: data.t.id, n: data.t.n});
            } else {
                var q = 'INSERT INTO `tags` (`id`, `name`) VALUES (null, \'' + string + '\')';
                db.connection.query(q, function(error, result, fields) {
                    if (!error) {
                        callback({id: result.insertId, n: string});
                    } else {
                        callback({error: 'db fail'});
                    }
                });
            }
        });
    }
    else {
        callback({error: 'not valid tag'});
    }

}

exports.addTrackTag = function(track, tag, callback) {
    db.connection.query('INSERT INTO tracktags (trackid, tagid) VALUES (' + track.id + ',' + tag.id + ')', function(e, result, fields) {
        callback();
    });
}


exports.sendinvite = function(code, mail, socket) {
    mg.sendText('tars@birdlab.com', [data.mail, 'allbirdrus@gmail.com'],
        'Клуб анонимных меломанов trigger.fm приглашает тебя!',
        'Привет, дорогой друг! Ты держишь в руках драгоценную ссылку, которая откроет тебе дверь в удивительный мир музыкальной прокрастинации! http://trigger.fm/invites/in.php?email=' + data.mail + '&code=' + code + ' Удачи!',
        function(err) {
            if (err) {
                socket.emit('invitestatus', {ok: false, m: mail});
            } else {
                db.connection.query('UPDATE invites SET  email="' + mail + '", send_time=NOW() WHERE  code = "' + code + '" LIMIT 1', function(error, result, fields) {
                    if (error) {
                        socket.emit('invitestatus', {ok: false, m: mail});
                    }
                    if (result) {
                        socket.emit('invitestatus', {ok: true, m: mail});
                    }
                });

            }
        });
}

exports.sendextinvite = function(data, callback) {
    if (callback) {
        if (data.mail) {
            data.mail = sanitizer.sanitize(data.mail);
            db.connection.query('SELECT * FROM invites WHERE email = \'' + data.mail + '\'', function(err, result, fields) {
                if (result.length) {
                    callback({error: 'exists'});
                } else {
                    var code = md5("sds" + Math.random() * 100000000000 + new Date().getTime() + "a");
                    db.connection.query('insert into invites (parentid, email, code, give_time,send_time, userid) VALUES ( 0,\'' + data.mail + '\', "' + code + '", NOW(), NOW(), 0)', function(er, result, fields) {
                        if (!er) {
                            mg.sendText('tars@birdlab.com', [data.mail, 'allbirdrus@gmail.com'],
                                'Клуб анонимных меломанов trigger.fm приглашает тебя!',
                                'Привет, дорогой друг! Ты держишь в руках драгоценную ссылку, которая откроет тебе дверь в удивительный мир музыкальной прокрастинации! http://trigger.fm/invites/in.php?email=' + data.mail + '&code=' + code + ' Удачи!',
                                function(err) {
                                    if (err) {
                                        callback({error: err});
                                    } else {
                                        callback({status: 'ok'});

                                    }
                                });

                        } else {
                            callback({error: er});
                        }

                    });
                }
            });
        }
    }
}


exports.recoverpass = function(mail, callback) {
    mail = sanitizer.sanitize(mail);
    db.connection.query('SELECT * FROM users WHERE email = \'' + mail + '\'', function(err, result, fields) {
        if (!err) {
            if (result[0]) {
                var pass = md5("pass" + Math.random() * 100000000000 + new Date().getTime() + "a").substring(3, 9);
                var code = md5(pass);
                db.connection.query('UPDATE users SET  password="' + code + '" WHERE  email = "' + mail + '" LIMIT 1', function(error, r, fields) {
                    if (error) {
                        callback({ok: false, e: 'db fail'});
                    }
                    if (r) {
                        mg.sendText('tars@birdlab.com', [result[0].email, 'allbirdrus@gmail.com'],
                            'trigger.fm принес тебе твой новый пароль',
                            'Привет,' + result[0].name + '! Кто-то, возможно ты, решил сбросить твой пароль на trigger.fm. Твой новый пароль: ' + pass,
                            function(err) {
                                if (err) {
                                    callback({ok: false, e: 'sending mail fail'});
                                } else {
                                    console.log('Привет, ' + result[0].name + ' на твой ящик ' + result[0].email + ' отправлен новый пароль ;)')
                                    callback({
                                        ok: true,
                                        m: 'Привет, ' + result[0].name + ' на твой ящик ' + result[0].email + ' отправлен новый пароль ;)'
                                    });
                                }
                            });

                    }
                });
            } else {
                console.log('no user');
                callback({ok: false, e: 'no user'});
            }
        } else {
            console.log('db fail');
            callback({ok: false, e: 'db fail'});
        }
    });


}

exports.changeuserpass = function(id, pass, callback) {
    var newpass = sanitizer.sanitize(pass);
    db.connection.query('UPDATE users SET password ="' + newpass + '" WHERE id = ' + id, function(err, result, fields) {
        if (!err) {
            callback({ok: true});
        } else {
            callback({ok: false, e: err});
        }
    });


}
exports.changeuserdata = function(user) {
    if (user.genderupdated) {
        console.log('update gender');
        var g = 0;
        if (user.gender) {
            g = 1;
        }
        db.connection.query('UPDATE users SET gender =' + g + ' WHERE id = ' + user.id, function(err, result, fields) {
            if (err) {
                console.log('gender fail');
                console.log(err);
            } else {
                user.genderupdated = false;
            }
        });

    }
    if (user.info) {
        db.connection.query('UPDATE users SET info =' + db.connection.escape(user.info) + ' WHERE id = ' + user.id, function(err, result, fields) {
            if (err) {
                console.log('info fail');
                console.log(err);
            }
        });
    }
    if (user.picture) {
        db.connection.query('UPDATE users SET picture =' + db.connection.escape(user.picture) + ' WHERE id = ' + user.id, function(err, result, fields) {
            if (err) {
                console.log('picture fail');
                console.log(err);
            }
        });
    }

}


exports.setLiveTime = function(id, time) {
    var q = 'UPDATE tracks SET time = ' + time + ' WHERE id =' + id;
    db.connection.query(q, function(error, result, fields) {
    });
}
exports.generateinvite = function(userid) {
    var code = md5("sds" + Math.random() * 100000000000 + new Date().getTime() + "a");
    db.connection.query('insert into invites (parentid, code, give_time, userid) VALUES (' + userid + ', "' + code + '", NOW(), 0)', function(error, result, fields) {
    });
}
exports.banuser = function(data) {
    console.log('to base - ', data);
    db.connection.query('insert into banned (id, chid, reason, killerid, bantime) VALUES (' + data.id + ', ' + data.chid + ', ' + db.connection.escape(data.reason) + ',' + data.killerid + ',"' + data.bantime + '")', function(error, result, fields) {
        console.log(error);
    });
}
exports.unbanuser = function(data) {
    console.log('to base - ', data);
    db.connection.query('DELETE FROM banned WHERE id = ' + data.id + ' AND chid = ' + data.chid + ' LIMIT 1;', function(error, result, fields) {
        console.log(error);
    });
}

exports.setpr = function(data) {
    console.log('to base - ', data);
    db.connection.query('UPDATE channels SET prid = ' + data.id + ' WHERE `id` = ' + data.chid + ';', function(error, result, fields) {
        console.log(error);
    });
}

exports.setop = function(data, callback) {
    db.connection.query('INSERT INTO editors (id, chid, post) VALUES (' + data.id + ', ' + data.chid + ', "' + data.post + '");', function(error, result, fields) {
        callback(error);
    });
}
exports.replaceop = function(data) {
    db.connection.query('UPDATE editors SET post = "' + data.post + '" WHERE `id` = ' + data.id + ' AND chid=' + data.chid + ';', function(error, result, fields) {
        console.log(error);
    });
}
exports.removeop = function(data) {
    db.connection.query('DELETE FROM editors WHERE id = ' + data.id + ' AND chid = ' + data.chid + ';', function(error, result, fields) {
        console.log(error);
    });
}
exports.savechannelstate = function(data, callback) {
    if (data.description) {
        db.connection.query('UPDATE channels SET description = ' + db.connection.escape(data.description) + ' WHERE `id` = ' + data.chid + ';', function(error, result, fields) {
            var bddata = {};
            if (error) {
                bddata.error = error;
            }
            console.log(bddata);
            callback(bddata);
        });
    }
}
exports.startElection = function(data, callback) {
    if (data.channel) {
        var ans = {};
        db.connection.query('SELECT * FROM prvote WHERE chid= ' + data.channel + ' AND date BETWEEN NOW() - INTERVAL 1 DAY AND NOW()', function(error, result, fields) {
            if (result.length) {
                ans.status = 'active';
                ans.votes = result;
                callback(ans);
            } else {
                ans.status = 'started';
                callback(ans);
            }
        });
    }
}
exports.addPRVote = function(data, callback) {
    if (data) {
        var ans = {};
        db.connection.query('SELECT prvote.id FROM prvote WHERE chid= ' + data.channel + ' AND voterid= ' + data.voterid + ' AND date BETWEEN NOW() - INTERVAL 1 DAY AND NOW()', function(error, result, fields) {
            if (result.length) {
                db.connection.query('UPDATE prvote SET prid= ' + data.prid + ' WHERE id= ' + result[0].id, function(error, result, fields) {
                    if (!error) {
                        //itsok
                    } else {
                        //ohshit!
                    }
                });
            } else {
                db.connection.query('INSERT INTO prvote (voterid, prid, chid, date) VALUES (' + data.voterid + ', ' + data.prid + ',' + data.channel + ', NOW());', function(error, result, fields) {
                    if (!error) {
                        //itsok
                    } else {
                        //ohshit!
                    }
                });
            }
        });
    }
}
exports.addPost = function(data, callback) {
    if (data.content) {
        var q = 'INSERT INTO post (content, senderid, date, lastupdate) VALUES (' + db.connection.escape(data.content) + ', ' + data.senderid + ', NOW(), NOW());';
        dumbquery(q, callback);
    }
}
exports.addComment = function(data, callback) {
    if (!data.parentid) {
        data.parentid = 'NULL';
    }
    var q = 'INSERT INTO comment (content, senderid, postid, parentid, date) VALUES (' + db.connection.escape(data.content) + ', ' + data.senderid + ',' + data.postid + ',' + data.parentid + ', NOW());'
    dumbquery(q, function(a) {
        if (!a.error) {
            q = 'UPDATE post SET lastupdate = NOW() WHERE id= ' + data.postid;
            dumbquery(q, callback);
        } else {
            console.log(a.error);
            callback(a);
        }
    });
}

exports.getUserByName = function(id, callback) {
    db.connection.query('SELECT * FROM users WHERE name = ' + db.connection.escape(id), function(e, result, fields) {
        if (!e) {
            if (result[0]) {
                var userid = result[0].id;
            } else {
                var userid = -10;
            }
            callback({'id': userid});
        } else {
            callback({'error': 'database fail'});
        }
    });
}
exports.getPosts = function(callback, d) {
    console.log(callback);
    console.log(d);
    if (callback) {
        var datestring = '';
        if (d && d.date) {
            datestring = 'AND post.lastupdate < ' + db.connection.escape(d.date);
        }
        var q = 'SELECT post.*, users.name FROM post LEFT JOIN users ON post.senderid=users.id WHERE post.killer IS NULL ' + datestring + ' ORDER BY post.lastupdate DESC LIMIT 20'
        dumbquery(q, function(data) {
            if (!data.error) {
                var ids = [];
                for (var i in data) {
                    ids.push(data[i].id);
                }
                var q = 'SELECT comment.postid, COUNT(comment.id) as count FROM comment WHERE comment.postid in (' + ids + ') group by comment.postid ORDER BY comment.date DESC';
                dumbquery(q, function(d) {
                    if (!d.error) {
                        for (var a in d) {
                            for (var f in data) {
                                if (data[f].id == d[a].postid) {
                                    data[f].count = d[a].count;
                                    break;
                                }
                            }
                        }
                        callback(data);
                    }

                });
            }
        });
    }
}

exports.getPost = function(callback, d) {
    console.log('callback - ' + callback);
    console.log('data - ' + d);
    if (callback) {
        var datestring = '';
        if (d && d.id) {
            var q = 'SELECT post.*, users.name FROM post LEFT JOIN users ON post.senderid=users.id WHERE post.id=' + d.id + ' AND post.killer IS NULL LIMIT 20'
            console.log(q);
            dumbquery(q, function(data) {
                if (!data.error) {
                    var ids = [];
                    for (var i in data) {
                        ids.push(data[i].id);
                    }
                    var q = 'SELECT comment.postid, COUNT(comment.id) as count FROM comment WHERE comment.postid in (' + ids + ') group by comment.postid ORDER BY comment.date DESC';
                    dumbquery(q, function(d) {
                        if (!d.error) {
                            for (var a in d) {
                                for (var f in data) {
                                    if (data[f].id == d[a].postid) {
                                        data[f].count = d[a].count;
                                        break;
                                    }
                                }
                            }
                            callback(data);
                        }

                    });
                }
            });
        }
    }
}
exports.killPost = function(data, callback) {
    if (data.id) {
        var q = 'SELECT post.date FROM post WHERE post.id=' + data.id + ' LIMIT 1';
        dumbquery(q, function(a) {
            if (!a.error) {
                q = 'SELECT prvote.date FROM prvote ORDER BY prvote.date DESC LIMIT 1';
                dumbquery(q, function(b) {
                    if (!b.error) {
                        console.log(a[0].date);
                        console.log(b[0].date);
                        if ((a[0].date - b[0].date) > 0) {
                            q = 'UPDATE post SET post.killer= ' + data.killerid + ' WHERE id = ' + data.id + ' LIMIT 1;';
                            dumbquery(q, callback);
                        } else {
                            callback({error: 'Пост был написан раньше'});
                        }
                    }
                });
            }
        });

    }
}

exports.getComments = function(data, callback) {
    if (data.id) {
        var q = 'SELECT comment.*, users.name FROM comment LEFT JOIN users ON comment.senderid=users.id WHERE postid=' + data.id + ' ORDER BY parentid, date';
        dumbquery(q, callback);
    }
}

function dumbquery(query, callback) {
    db.connection.query(query, function(er, result, fields) {
        if (!er) {
            callback(result);
        } else {
            console.log(er);
            callback({error: er})
        }
    });
}