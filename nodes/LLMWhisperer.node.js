// This file will contain the implementation of the custom n8n node.
// Functionality will be added later.

const { IExecuteFunctions } = require('n8n-core');
const {
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} = require('n8n-workflow');

const { NodeOperationError } = require('n8n-workflow');

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
            properties: [
                {
                    displayName: 'LLMWhisperer Host',
                    name: 'host',
                    type: 'string',
                    default: 'https://llmwhisperer-api.unstract.com',
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
                            value: 'form'
                        },
                        {
                            name: 'High Quality',
                            value: 'high_quality'
                        },
                        {
                            name: 'Low Cost',
                            value: 'low_cost'
                        },
                        {
                            name: 'Native Text',
                            value: 'native_text'
                        }
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
                            value: 'layout_preserving'
                        },
                        {
                            name: 'Text',
                            value: 'text'
                        }
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
                        maxValue: 1
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
                }
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

            for (let i = 0; i < items.length; i++) {
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
                
                const result = {
                    host,
                    mode,
                    outputMode,
                    apiKey // Include API key in result for debugging (you may want to remove this in production)
                };

                returnData.push({
                    json: result,
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

module.exports = { LLMWhisperer };
