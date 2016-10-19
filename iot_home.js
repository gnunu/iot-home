var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var formidable = require('formidable');
var cache = {};

function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

function sendOk(response) {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write('OK.');
    response.end();
}

function sendFile(response, filePath, fileContents) {
    response.writeHead(200, {"content-type": mime.lookup(path.basename(filePath))});
    response.end(fileContents);
}

function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function(exists) {
            if (exists) {
                fs.readFile(absPath, function(err, data) {
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                });
            } else {
                send404(response);
            }
        });
    }
}

var server = http.createServer(function(req, res) {
    var filePath = false;

    switch (req.method) {
    case 'GET':
        if (req.url == '/') {
            filePath = 'public/index.html';
        } else {
            filePath = 'public' + req.url;
        }
        var absPath = './' + filePath;
        serveStatic(res, cache, absPath);
        break;
    case 'POST':
        switch (req.url) {
        case '/file':
            process_file(req, res);
            break;
        default:
            process_small(req, res);
        }
        break;
    }
});

function process_small(req, res) {
    var body = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) {
        body += chunk;
    });
    req.on('end', function() {
        console.log(body);
        var qs = require('querystring');
        var val = qs.parse(body);
        switch (req.url) {
        case '/link':
            var link = val.link;
            console.log(link);
            res.writeHead(301, {Location: link});
            res.end();
            break;
        case '/seed':
            var seed = val.seed;
            console.log(seed);
            res.writeHead(301, {Location: 'http://localhost:3000/'});
            res.end();
        }
    });
}

function copy(src, dst) {
    fs.createReadStream(src).pipe(fs.createWriteStream(dst));
}

function process_file(req, res) {
    var form = new formidable.IncomingForm();
    var realName, tmpName;
    form.parse(req, function(err, fields, files) {
        copy(files.file.path, 'data/' + files.file.name);
        res.end('File upload ok!');
    });
}

function isFormData(req) {
    var type = req.headers['content-type'] || '';
    return 0 == type.indexOf('multipart/form-data');
}

server.listen(3000, function() {
    console.log("Server listening on port 3000");
});
