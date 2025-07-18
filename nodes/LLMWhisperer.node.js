// This file will contain the implementation of the custom n8n node.
// Functionality will be added later.

const { NodeOperationError } = require('n8n-workflow');

// Helper function for sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class LLMWhisperer {
    constructor() {
        this.description = {
            displayName: 'LLMWhisperer',
            name: 'llmWhisperer',
            icon: 'file:llmWhisperer.svg',
            group: ['transform'],
            version: 1,
            description: 'Convert your documents to layout preserved plain text using LLMWhisperer',
            defaults: {
                name: 'LLMWhisperer',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'llmWhispererApi',
                    required: true,
                },
            ],
            inputDataType: ['binary'],
            properties: [
                {
                    displayName: 'File contents',
                    name: 'file_contents',
                    type: 'string',
                    default: 'data',
                    description: 'The file contents to be processed',
                    required: true,
                },
                {
                    displayName: 'LLMWhisperer Host',
                    name: 'host',
                    type: 'string',
                    default: 'https://llmwhisperer-api.us-central.unstract.com',
                    description: 'Host URL for the LLMWhisperer API',
                    required: true,
                },
                {
                    displayName: 'Mode',
                    name: 'mode',
                    type: 'options',
                    options: [
                        {
                            name: 'Form',
                            value: 'form',
                        },
                        {
                            name: 'High Quality',
                            value: 'high_quality',
                        },
                        {
                            name: 'Low Cost',
                            value: 'low_cost',
                        },
                        {
                            name: 'Native Text',
                            value: 'native_text',
                        },
                    ],
                    default: 'form',
                    description: 'The mode to use for text extraction',
                    required: true,
                },
                {
                    displayName: 'Output Mode',
                    name: 'output_mode',
                    type: 'options',
                    options: [
                        {
                            name: 'Layout Preserving',
                            value: 'layout_preserving',
                        },
                        {
                            name: 'Text',
                            value: 'text',
                        },
                    ],
                    default: 'layout_preserving',
                    description: 'The output format of the extracted text',
                    required: true,
                },
                {
                    displayName: 'Timeout',
                    name: 'timeout',
                    type: 'number',
                    default: 300,
                    description: 'Timeout in seconds for the API request',
                },
                {
                    displayName: 'Page Separator',
                    name: 'page_seperator',
                    type: 'string',
                    default: '<<<',
                    description: 'The string to be used as a page separator',
                },
                {
                    displayName: 'Pages to Extract',
                    name: 'pages_to_extract',
                    type: 'string',
                    default: '',
                    description: 'Define which pages to extract. Example: 1-5,7,21- will extract pages 1,2,3,4,5,7,21,22,23,24... till the last page',
                },
                {
                    displayName: 'Line Splitter Tolerance',
                    name: 'line_splitter_tolerance',
                    type: 'number',
                    typeOptions: {
                        minValue: 0,
                        maxValue: 1,
                    },
                    default: 0.4,
                    description: 'Factor to decide when to move text to the next line (40% of average character height)',
                },
                {
                    displayName: 'Line Splitter Strategy',
                    name: 'line_splitter_strategy',
                    type: 'string',
                    default: 'left-priority',
                    description: 'The line splitter strategy to use. Advanced option for customizing line splitting',
                },
                {
                    displayName: 'Horizontal Stretch Factor',
                    name: 'horizontal_stretch_factor',
                    type: 'number',
                    default: 1.0,
                    description: 'Factor for horizontal stretch. 1.1 means 10% stretch',
                },
                {
                    displayName: 'Mark Vertical Lines',
                    name: 'mark_vertical_lines',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to reproduce vertical lines in the document. Not applicable if mode=native_text',
                },
                {
                    displayName: 'Mark Horizontal Lines',
                    name: 'mark_horizontal_lines',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to reproduce horizontal lines. Not applicable if mode=native_text, requires mark_vertical_lines=true',
                },
                {
                    displayName: 'Tag',
                    name: 'tag',
                    type: 'string',
                    default: 'default',
                    description: 'Auditing feature. Value associated with API invocation for usage reports',
                },
                {
                    displayName: 'File Name',
                    name: 'file_name',
                    type: 'string',
                    default: '',
                    description: 'Auditing feature. Value associated with API invocation for usage reports',
                },
                {
                    displayName: 'Add Line Numbers',
                    name: 'add_line_nos',
                    type: 'boolean',
                    default: false,
                    description: 'Adds line numbers to extracted text and saves line metadata for highlights API',
                },
            ],
        };
    }

    /**
     * @param {IExecuteFunctions} this
     * @returns {Promise<INodeExecutionData[][]>}
     */
    async execute() {
        const items = this.getInputData();
        const returnData = [];

        try {
            // Get credentials for LLMWhisperer API
            const credentials = await this.getCredentials('llmWhispererApi');
            const apiKey = credentials.apiKey;

            // Get helper functions
            const { helpers, logger } = this;

            for (let i = 0; i < items.length; i++) {
                const fileContents = this.getNodeParameter('file_contents', i);

                // Check if the binary data property exists
                if (!items[i].binary?.[fileContents]) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `No binary data property "${fileContents}" exists on input`,
                    );
                }

                // Get the binary data
                const binaryData = items[i].binary[fileContents];
                const fileBuffer = Buffer.from(binaryData.data, 'base64');

                const host = this.getNodeParameter('host', i);
                const mode = this.getNodeParameter('mode', i);
                const outputMode = this.getNodeParameter('output_mode', i);
                const pageSeparator = this.getNodeParameter('page_seperator', i);
                const pagesToExtract = this.getNodeParameter('pages_to_extract', i);
                const lineSplitterTolerance = this.getNodeParameter('line_splitter_tolerance', i);
                const lineSplitterStrategy = this.getNodeParameter('line_splitter_strategy', i);
                const horizontalStretchFactor = this.getNodeParameter('horizontal_stretch_factor', i);
                const markVerticalLines = this.getNodeParameter('mark_vertical_lines', i);
                const markHorizontalLines = this.getNodeParameter('mark_horizontal_lines', i);
                const tag = this.getNodeParameter('tag', i);
                const fileName = this.getNodeParameter('file_name', i);
                const addLineNumbers = this.getNodeParameter('add_line_nos', i);
                const timeout = this.getNodeParameter('timeout', i);


                // Prepare API request parameters
                const requestOptions = {
                    method: 'POST',
                    url: `${host}/api/v2/whisper`,
                    headers: {
                        'unstract-key': `${apiKey}`,
                        'Content-Type': 'application/octet-stream',
                    },
                    body: fileBuffer,
                    timeout: 120 * 1000,
                    qs: {
                        mode: mode,
                        output_mode: outputMode,
                        page_seperator: pageSeparator,
                        pages_to_extract: pagesToExtract,
                        line_splitter_tolerance: lineSplitterTolerance,
                        line_splitter_strategy: lineSplitterStrategy,
                        horizontal_stretch_factor: horizontalStretchFactor,
                        mark_vertical_lines: markVerticalLines,
                        mark_horizontal_lines: markHorizontalLines,
                        tag: tag,
                        file_name: fileName,
                        add_line_nos: addLineNumbers,
                    },
                };

                // Make the API request
                logger.info('Making API request to LLMWhisperer API...');
                let result;
                try {
                    result = await helpers.request(requestOptions);
                } catch (requestError) {
                    logger.error('Error during LLMWhisperer API request:', requestError);
                    throw requestError;
                }

                if (result.status && result.status != 202) {
                    throw new NodeOperationError(this.getNode(), result.body);
                }

                //Convert result to JSON
                const resultContent = JSON.parse(result);
                let whisper_hash = resultContent['whisper_hash'];

                let status = 'processing';
                const t1 = Date.now();

                while (status !== 'processed' && status !== 'error') {
                    await sleep(2000);

                    const statusResult = await helpers.request({
                        method: 'GET',
                        url: `${host}/api/v2/whisper-status`,
                        headers: {
                            'unstract-key': `${apiKey}`,
                        },
                        qs: {
                            whisper_hash: whisper_hash,
                        },
                    });

                    const resultContentX = JSON.parse(statusResult);
                    status = resultContentX['status'];

                    const t2 = Date.now();
                    const elapsedSeconds = (t2 - t1) / 1000;

                    if (elapsedSeconds > timeout) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Operation timed out after ${timeout} seconds`,
                        );
                    }

                    // Check for error status
                    if (status === 'error') {
                        const errorMessage = resultContentX.message || 'Processing failed';
                        const errorDetails = resultContentX.detail ? JSON.stringify(resultContentX.detail) : '';
                        throw new NodeOperationError(
                            this.getNode(),
                            `LLMWhisperer processing error: ${errorMessage}. ${errorDetails}`,
                        );
                    }
                }

                // Only retrieve if status is 'processed'
                if (status === 'processed') {
                    // Retrieve the extraction using the whisper-retrieve endpoint
                    const retrieveResult = await helpers.request({
                        method: 'GET',
                        url: `${host}/api/v2/whisper-retrieve`,
                        headers: {
                            'unstract-key': `${apiKey}`,
                        },
                        qs: {
                            whisper_hash: whisper_hash,
                        },
                    });

                    const retrieveResultContent = JSON.parse(retrieveResult);
                    delete retrieveResultContent.metadata;
                    delete retrieveResultContent.webhook_metadata;
                    returnData.push({
                        json: retrieveResultContent,
                    });
                }
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

module.exports = { LLMWhisperer };
