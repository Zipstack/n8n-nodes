class LLMWhispererApi {
    constructor() {
        this.name = 'llmWhispererApi';
        this.displayName = 'LLMWhisperer API';
        this.documentationUrl = 'https://docs.unstract.com/llmwhisperer/';
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
                description: 'The API key for LLMWhisperer',
            },
        ];
    }
}

module.exports = {
    LLMWhispererApi,
};
