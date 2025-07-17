
class UnstractHITL {
    constructor() {
        this.name = 'unstractHITL';
        this.displayName = 'Unstract HITL';
        this.documentationUrl = 'https://docs.unstract.com/unstract/index.html';
        this.icon = 'file:llmWhisperer.svg';
        this.properties = [
            {
                displayName: 'HITL Key',
                name: 'HITLKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                description: 'The Bearer token for Unstract HITL API',
            },
            {
                displayName: 'Organization ID',
                name: 'orgId',
                type: 'string',
                default: '',
                required: true,
                description: 'Your Unstract Organization ID',
            },
        ];
    }
}

module.exports = { UnstractHITL };
