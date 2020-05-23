const BROKER_ENDPOINT = "tcp://127.0.0.1:6060"

var socket_io = require('socket.io')(8090);

const zmq = require("zeromq")

async function updateDevice(data)
{
    /* data format
     * {
     *     "id" : device_id,
     *     "service" : name of MDP service able to process the payload
     *     "payload" : [] - array of data
     * }
     * */
        zmq_socket = new zmq.Request
        zmq_socket.connect(BROKER_ENDPOINT);

        console.log(
            arguments.callee.name,
            "id", data.id,
            "service", data.service,
            "payload length", data.payload.length);

        await zmq_socket.send(
            [
                "MDPC01", /* MDP client signature */
                data.service, /* service name */
                JSON.stringify(data.payload)
            ]);
        [signature, service, reply] = await zmq_socket.receive();

        console.log(
            arguments.callee.name,
            signature.toString(),
            service.toString(),
            reply.toString());
}

async function dispatchUpdateLamp(id, mode, r, g, b)
{
    console.log("dispatchUpdateLamp", id, mode, r, g, b);

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

    [signature, service, reply] = await zmq_socket.receive();

    console.log(
        arguments.callee.name,
        signature.toString(),
        service.toString());

    var jsonArray = JSON.parse(reply.toString());

    for(var i = 0; i < jsonArray.length; ++i)
    {
        await updateDevice(jsonArray[i]);
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
                dispatchUpdateLamp(data.id, data.mode, data.R, data.G, data.B);
            });
    });

process.on(
    'SIGINT',
    function()
    {
        process.exit();
    });
