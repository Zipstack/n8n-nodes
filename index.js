// This file is required as the main entry point for the npm package
// It exports all nodes and credentials for n8n to discover

module.exports = {
    credentials: {
        LLMWhispererApi: require('./dist/credentials/LLMWhispererApi.credentials.js'),
        UnstractApi: require('./dist/credentials/UnstractApi.credentials.js'),
        UnstractHITL: require('./dist/credentials/UnstractHITL.credentials.js'),
    },
    nodes: {
        LLMWhisperer: require('./dist/nodes/LLMWhisperer.node.js'),
        Unstract: require('./dist/nodes/Unstract.node.js'),
        UnstractHITLFetch: require('./dist/nodes/UnstractHITLFetch.node.js'),
        UnstractHITLPush: require('./dist/nodes/UnstractHITLPush.node.js'),
    },
};
