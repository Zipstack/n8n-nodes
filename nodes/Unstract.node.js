const { NodeOperationError } = require('n8n-workflow');

// Helper function for sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Unstract {
    constructor() {
        this.description = {
            displayName: 'Unstract',
            name: 'unstract',
            icon: 'file:llmWhisperer.svg',
            group: ['transform'],
            version: 1,
            description: 'Process documents using Unstract API',
            defaults: {
                name: 'Unstract',
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
                    description: 'Name of the binary property that contains the file data to be processed',
                    required: true,
                },
                {
                    displayName: 'Unstract Host',
                    name: 'host',
                    type: 'string',
                    default: 'https://us-central.unstract.com',
                    description: 'Host URL for the Unstract API',
                    required: true,
                },
                {
                    displayName: 'API Deployment Name',
                    name: 'deployment_name',
                    type: 'string',
                    default: '',
                    description: 'Name of the API deployment to use',
                    required: true,
                },
                {
                    displayName: 'Timeout',
                    name: 'timeout',
                    type: 'number',
                    default: 600,
                    description: 'Maximum time in seconds to wait for processing',
                    required: true,
                },
                {
                    displayName: 'Include Metrics',
                    name: 'include_metrics',
                    type: 'boolean',
                    default: true,
                    description: 'Whether to include processing metrics in the response',
                },
                {
                    displayName: 'Include Metadata',
                    name: 'include_metadata',
                    type: 'boolean',
                    default: true,
                    description: 'Whether to include document metadata in the response',
                },
                {
                    displayName: 'Tags',
                    name: 'tags',
                    type: 'string',
                    default: '',
                    description: 'Comma-separated tags to associate with the document',
                },
                {
                    displayName: 'Use cached results',
                    name: 'use_file_history',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to use cached results if available. Useful while debugging your n8n workflow',
                },
            ],
        };
    }

    async execute() {
        const items = this.getInputData();
        const returnData = [];

        try {
            // Get credentials for Unstract API
            const credentials = await this.getCredentials('unstractApi');
            const apiKey = credentials.apiKey;
            const orgId = credentials.orgId;

            // Get helper functions
            const { helpers, logger } = this;

            for (let i = 0; i < items.length; i++) {
                const binaryPropertyName = this.getNodeParameter('file_contents', i);

                // Check if the binary data property exists
                if (!items[i].binary?.[binaryPropertyName]) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `No binary data property "${binaryPropertyName}" exists on input`,
                    );
                }

                // Get the binary data
                const binaryData = items[i].binary[binaryPropertyName];
                const fileBuffer = Buffer.from(binaryData.data, 'base64');

                const timeout = this.getNodeParameter('timeout', i);
                const deploymentName = this.getNodeParameter('deployment_name', i);
                const host = this.getNodeParameter('host',i);
                const includeMetrics = this.getNodeParameter('include_metrics', i);
                const includeMetadata = this.getNodeParameter('include_metadata', i);
                const tags = this.getNodeParameter('tags', i);
                const useFileHistory = this.getNodeParameter('use_file_history', i);

                // Create form data
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
                };

                if (tags) {
                    formData.tags = tags;
                }

                // Prepare API request parameters
                const requestOptions = {
                    method: 'POST',
                    url: `${host}/deployment/api/${orgId}/${deploymentName}/`,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    formData,
                    timeout: 5 * 60 * 1000,
                };

                // Make the API request
                logger.info('Making API request to Unstract API...');
                const result = await helpers.request(requestOptions);
                let resultContent = JSON.parse(result);
                resultContent = resultContent['message'];
                let execution_status = resultContent['execution_status'];
                if (execution_status === 'PENDING') {
                    let t1 = new Date();
                    const status_api = resultContent['status_api'];
                    while (execution_status !== 'COMPLETED') {
                        await sleep(2000);
                        const requestOptions = {
                            method: 'GET',
                            url: `${host}${status_api}`,
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            timeout: 5 * 60 * 1000,
                        };
                        try {
                            const result = await helpers.request(requestOptions);
                            resultContent = JSON.parse(result);
                            execution_status = resultContent['status'];
                        } catch (error) {
                            // Check if HTTP code is 400
                            if (error.response && error.response.statusCode === 400) {
                                throw new NodeOperationError(this.getNode(), `Error: ${error}`);
                            }
                            let json_response = error.message.split(' - ')[1];
                            json_response = json_response.replace(/\\"/g, '"').slice(1, -1);
                            resultContent = JSON.parse(json_response);
                            execution_status = resultContent['status'];
                        }
                        let t2 = new Date();
                        if ((t2-t1)/1000 > timeout) {
                            throw new NodeOperationError(this.getNode(), `Timeout reached: ${timeout} seconds`);
                        }
                        if (execution_status === 'ERROR') {
                            throw new NodeOperationError(this.getNode(), `Error: ${resultContent['message'][0]['error']}`);
                        }
                        if (execution_status === 'COMPLETED') {
                            resultContent = resultContent['message'];
                        }
                    }
                }

                returnData.push({
                    json: resultContent,
                });
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

module.exports = { Unstract };
