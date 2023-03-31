# NetplayJS Serialization Framework

Serialization serves two purposes in NetplayJS.
1. Sending synchronization data over the network, specifically game inputs and game states.
2. Saving a rewindable history of a game for use in Rollback netcode.

The main format for serialization is JSON - serializers should return JSON-compatible objects, and deserializers should take in JSON-compatible objects. JSON obviously has a lot of overhead, but it's schemaless, and easily interoperates with JavaScript code. For a production game, you may want to consider something like ProtoBufs. At the transport level, the JSON-compatible messages are encoded using msgpack for some small savings.