const BROKER_ENDPOINT = "tcp://127.0.0.1:6060"

var socket_io = require('socket.io')(8090);

const zmq = require("zeromq")

async function updateDevice(id, mode, r, g, b)
{
    console.log("updateDevice", id, mode, r, g, b);

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


socket_io.on(
    'connection',
    function (socket)
    {
        socket.on(
            'UpdateLamp',
            function(data)
            {
                updateDevice(data.id, data.mode, data.R, data.G, data.B);
            });
    });

process.on(
    'SIGINT',
    function()
    {
        process.exit();
    });
