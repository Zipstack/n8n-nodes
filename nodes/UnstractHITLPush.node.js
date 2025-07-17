const { NodeOperationError } = require('n8n-workflow');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class UnstractHITLPush {
    constructor() {
        this.description = {
            displayName: 'Unstract HITL Push',
            name: 'unstractHitlPush',
            icon: 'file:llmWhisperer.svg',
            group: ['transform'],
            version: 1,
            description: 'Push document for HITL processing using Unstract API',
            defaults: {
                name: 'Unstract HITL Push',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'unstractApi',
                    required: true,
                },
            ],
            inputDataType: ['binary'],
            properties: [
                {
                    displayName: 'File Contents',
                    name: 'file_contents',
                    type: 'string',
                    default: 'data',
                    description: 'Name of the binary property containing file data',
                    required: true,
                },
                {
                    displayName: 'Unstract Host',
                    name: 'host',
                    type: 'string',
                    default: 'https://us-central.unstract.com',
                    required: true,
                },
                {
                    displayName: 'API Deployment Name',
                    name: 'deployment_name',
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
                {
                    displayName: 'Timeout',
                    name: 'timeout',
                    type: 'number',
                    default: 600,
                    description: 'Max seconds to wait for processing',
                    required: true,
                },
                {
                    displayName: 'Include Metrics',
                    name: 'include_metrics',
                    type: 'boolean',
                    default: true,
                },
                {
                    displayName: 'Include Metadata',
                    name: 'include_metadata',
                    type: 'boolean',
                    default: true,
                },
                {
                    displayName: 'Tags',
                    name: 'tags',
                    type: 'string',
                    default: '',
                    description: 'Comma-separated tags for the document',
                },
                {
                    displayName: 'Use cached results',
                    name: 'use_file_history',
                    type: 'boolean',
                    default: false,
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        try {
            const credentials = await this.getCredentials('unstractApi');
            const apiKey = credentials.apiKey;
            const orgId = credentials.orgId;
            const { helpers, logger } = this;

            for (let i = 0; i < items.length; i++) {
                const binaryPropertyName = this.getNodeParameter('file_contents', i);
                if (!items[i].binary?.[binaryPropertyName]) {
                    throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" exists on input`);
                }

                const binaryData = items[i].binary[binaryPropertyName];
                const fileBuffer = Buffer.from(binaryData.data, 'base64');

                const timeout = this.getNodeParameter('timeout', i);
                const deploymentName = this.getNodeParameter('deployment_name', i);
                const host = this.getNodeParameter('host', i);
                const includeMetrics = this.getNodeParameter('include_metrics', i);
                const includeMetadata = this.getNodeParameter('include_metadata', i);
                const tags = this.getNodeParameter('tags', i);
                const useFileHistory = this.getNodeParameter('use_file_history', i);
                const hitlQueueName = this.getNodeParameter('hitl_queue_name', i);

                const formData = {
                    files: {
                        value: fileBuffer,
                        options: {
                            filename: binaryData.fileName,
                            contentType: binaryData.mimeType,
                        },
                    },
                    timeout: 1,
                    include_metrics: includeMetrics.toString(),
                    include_metadata: includeMetadata.toString(),
                    use_file_history: useFileHistory.toString(),
                    hitl_queue_name: hitlQueueName,
                };

                if (tags) {
                    formData.tags = tags;
                }

                const requestOptions = {
                    method: 'POST',
                    url: `${host}/deployment/api/${orgId}/${deploymentName}/`,
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                    formData,
                    timeout: 5 * 60 * 1000,
                };

                logger.info('[HITL] Sending file to Unstract HITL API...');
                let result = await helpers.request(requestOptions);
                let resultContent = JSON.parse(result).message;
                let execution_status = resultContent.execution_status;

                if (execution_status === 'PENDING' || execution_status === 'EXECUTING') {
                    const status_api = resultContent.status_api;
                    const t1 = new Date();

                    while (execution_status !== 'COMPLETED') {
                        await sleep(2000);

                        const pollRequest = {
                            method: 'GET',
                            url: `${host}${status_api}`,
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                            },
                            timeout: 5 * 60 * 1000,
                        };

                        try {
                            const pollResult = await helpers.request(pollRequest);
                            resultContent = JSON.parse(pollResult);
                            execution_status = resultContent.status;
                        } catch (error) {
                            if (error.response && error.response.statusCode === 400) {
                                throw new NodeOperationError(this.getNode(), `Polling error: ${error}`);
                            }
                            let json = error.message.split(' - ')[1];
                            json = json.replace(/\\"/g, '"').slice(1, -1);
                            resultContent = JSON.parse(json);
                            execution_status = resultContent.status;
                        }

                        const t2 = new Date();
                        if ((t2 - t1) / 1000 > timeout) {
                            throw new NodeOperationError(this.getNode(), `Timeout reached: ${timeout} seconds`);
                        }
                        if (execution_status === 'ERROR') {
                            throw new NodeOperationError(this.getNode(), `Error: ${resultContent.message[0]?.error}`);
                        }
                        if (execution_status === 'COMPLETED') {
                            resultContent = resultContent.message;
                        }
                    }
                }

                returnData.push({ json: resultContent });
            }

            return [returnData];
        } catch (error) {
            if (error.message) {
                throw new NodeOperationError(this.getNode(), error.message);
            }
            throw error;
        }
    }
}

module.exports = { UnstractHITLPush };
