class UnstractApi {
    constructor() {
        this.name = 'unstractApi';
        this.displayName = 'Unstract API';
        this.documentationUrl = 'https://docs.unstract.com/unstract/index.html';
		this.icon = 'file:llmWhisperer.svg';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                description: 'The Unstract API Bearer token',
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

module.exports = { UnstractApi };
