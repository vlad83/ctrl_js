const BROKER_ENDPOINT = "tcp://127.0.0.1:6060"
const MDP_RECV_TIMEOUT = 1000;
const MDP_SEND_TIMEOUT = 1000;

let socket_io = require('socket.io')(8090);

const zmq = require("zeromq")

function log()
{
    console.log(new Date().toJSON(), arguments.callee.caller.name);
    console.log.apply(console.log, arguments);
}

async function updateDevice(data)
{
    /* data format
     * {
     *     "id" : device_id,
     *     "service" : name of MDP service able to process the payload
     *     "payload" : [] - array of data
     * }
     * */
    let zmq_socket =
        new zmq.Request(
        {
            sendTimeout : MDP_SEND_TIMEOUT,
            receiveTimeout : MDP_RECV_TIMEOUT
        });

    zmq_socket.connect(BROKER_ENDPOINT);

    log(
        "id", data.id,
        "service", data.service,
        "payload length", data.payload.length);

    try
    {
        await zmq_socket.send(
            [
                "MDPC01", /* MDP client signature */
                data.service, /* service name */
                JSON.stringify(data.payload)
            ]);

        [signature, service, reply] = await zmq_socket.receive();

        log(
            signature.toString(),
            service.toString(),
            reply.toString());
    }
    catch(err)
    {
        log(err);
        zmq_socket.disconnect(BROKER_ENDPOINT);
    }
}

async function dispatchUpdateLamp(request)
{
    log("request", request);

    let zmq_socket =
        new zmq.Request(
        {
            sendTimeout : MDP_SEND_TIMEOUT,
            receiveTimeout : MDP_RECV_TIMEOUT
        });

    zmq_socket.connect(BROKER_ENDPOINT);

    let payload =
        {
            "id" : request.id,
            "mode" : request.mode,
        };

    if("solid_rgb" === request.mode)
    {
        payload.RGB = [request.R, request.G, request.B];
    }

    try
    {
        await zmq_socket.send(
            [
                "MDPC01", /* MDP client signature */
                "rgb", /* service name */
                JSON.stringify(payload)
            ]);


        [signature, service, reply] = await zmq_socket.receive();

        if("service unsupported" !== reply.toString())
        {
            let jsonArray = JSON.parse(reply.toString());

            for(let i = 0; i < jsonArray.length; ++i)
            {
                await updateDevice(jsonArray[i]);
            }
        }
    }
    catch(err)
    {
        log("error", err);
        zmq_socket.disconnect(BROKER_ENDPOINT);
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
                dispatchUpdateLamp(data);
            });
    });

process.on(
    'SIGINT',
    function()
    {
        process.exit();
    });
