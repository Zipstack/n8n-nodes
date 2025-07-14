const { NodeOperationError } = require('n8n-workflow');

class UnstractHITLFetch {
    constructor() {
        this.description = {
            displayName: 'Unstract HITL Fetch',
            name: 'unstractHitlFetch',
            icon: 'file:llmWhisperer.svg',
            group: ['transform'],
            version: 1,
            description: 'Fetch final result from HITL queue using Unstract API',
            defaults: {
                name: 'Unstract HITL Fetch',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'unstractHITL',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Unstract Host',
                    name: 'host',
                    type: 'string',
                    default: 'http://localhost:8000',
                    required: true,
                },
                {
                    displayName: 'Workflow ID',
                    name: 'workflow_id',
                    type: 'string',
                    default: '',
                    required: true,
                },
                {
                    displayName: 'HITL Queue Name',
                    name: 'hitl_queue_name',
                    type: 'string',
                    default: '',
                    required: true,
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        const credentials = await this.getCredentials('unstractHITL');
        const hitlKey = credentials.HITLKey;
        const orgId = credentials.orgId;

        const helpers = this.helpers;

        for (let i = 0; i < items.length; i++) {
            const host = this.getNodeParameter('host', i);
            const workflowId = this.getNodeParameter('workflow_id', i);
            const hitlQueueName = this.getNodeParameter('hitl_queue_name', i);

            const url = `${host}/mr/api/${orgId}/approved/result/${workflowId}/?hitl_queue_name=${encodeURIComponent(hitlQueueName)}`;

            const options = {
                method: 'GET',
                url,
                headers: {
                    Authorization: `Bearer ${hitlKey}`,
                },
            };

            try {
                const response = await helpers.request(options);
                const parsed = typeof response === 'string' ? JSON.parse(response) : response;

                if (parsed.error) {
                    if (parsed.error === 'No approved items available.') {
                        returnData.push({ json: { message: 'No approved items available', hasData: false } });
                    } else {
                        throw new NodeOperationError(this.getNode(), `API Error: ${parsed.error}`);
                    }
                } else if (parsed.data) {
                    returnData.push({ json: { ...parsed.data, hasData: true } });
                } else {
                    throw new NodeOperationError(this.getNode(), 'Unexpected response format.');
                }

            } catch (error) {
                if (error.response && error.response.statusCode === 404) {
                    throw new NodeOperationError(this.getNode(), 'Result not yet available (404)');
                }
                if (error.response && error.response.statusCode === 500) {
                    throw new NodeOperationError(this.getNode(), 'Server error (500)');
                }
                throw new NodeOperationError(this.getNode(), `Failed to fetch HITL result: ${error.message}`);
            }
        }

        return [returnData];
    }
}

module.exports = { UnstractHITLFetch };
