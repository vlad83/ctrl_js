const BROKER_ENDPOINT = "tcp://127.0.0.1:6060"

var http = require('http').createServer(handler);
var fs = require('fs');
var socket_io = require('socket.io')(http);

const zmq = require("zeromq")

async function updateDevice(id, mode, r, g, b)
{
    zmq_socket = new zmq.Request
    zmq_socket.connect(BROKER_ENDPOINT);
    await zmq_socket.send(
        [
            "MDPC01", /* MDP client signature */
            "rgb", /* service name */
            JSON.stringify(
                {
                    "id" : id,
                    "mode" : mode,
                    "RGB" : [r, g, b]
                })
        ]);
    [signature, serivce, message] = await zmq_socket.receive();

    console.log(signature.toString());
    console.log(serivce.toString());

    var jsonArray = JSON.parse(message.toString());

    console.log("data length ", jsonArray.length);

    for(var i = 0; i < jsonArray.length; ++i)
    {
        console.log(jsonArray[i]);

        await zmq_socket.send(
            [
                "MDPC01", /* MDP client signature */
                "modbus_master_/dev/ttyUSB0", /* service name */
                JSON.stringify(jsonArray[i])
            ]);
    }
}

function handler(request, response)
{
    fs.readFile(
        __dirname + '/public/rgb_ctrl.html',
        function(err, fileData)
        {
            if (err)
            {
                console.log(err);
                response.writeHead(404, {'Content-Type': 'text/html'});
                return response.end("404 Not Found");
            }
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(fileData);
            return response.end();
        });
}

socket_io.sockets.on(
    'connection',
    function (socket)
    {
        socket.on(
            'UpdateRGB',
            function(data)
            {
                updateDevice(data.id, data.mode, data.R, data.G, data.B);
            });
    });

http.listen(8080);

process.on(
    'SIGINT',
    function()
    {
        process.exit();
    });
