import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
	IHttpRequestMethods,
} from 'n8n-workflow';

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		// Use Promise-based delay that doesn't rely on restricted globals
		const start = Date.now();
		const check = (): void => {
			if (Date.now() - start >= ms) {
				resolve();
			} else {
				// Use Promise.resolve() for non-blocking delay
				Promise.resolve().then(check);
			}
		};
		check();
	});

export class LlmWhisperer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LLMWhisperer',
		name: 'llmWhisperer',
		icon: 'file:llmWhisperer.svg',
		group: ['transform'],
		version: 1,
		description: 'Extract text from PDFs, images, and scanned documents using OCR. Preserves layout and formatting for accurate text extraction from any document type',
		subtitle: '={{$parameter["mode"] + " mode, " + $parameter["output_mode"] + " output"}}',
		defaults: {
			name: 'LLMWhisperer',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'llmWhispererApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'File Contents',
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
				description:
					'Define which pages to extract. Example: 1-5,7,21- will extract pages 1,2,3,4,5,7,21,22,23,24... till the last page',
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
				description:
					'Factor to decide when to move text to the next line (40% of average character height)',
			},
			{
				displayName: 'Line Splitter Strategy',
				name: 'line_splitter_strategy',
				type: 'string',
				default: 'left-priority',
				description: 'The line splitter strategy to use. Advanced option for customizing line splitting.',
			},
			{
				displayName: 'Horizontal Stretch Factor',
				name: 'horizontal_stretch_factor',
				type: 'number',
				default: 1.0,
				description: 'Factor for horizontal stretch. 1.1 means 10% stretch.',
			},
			{
				displayName: 'Mark Vertical Lines',
				name: 'mark_vertical_lines',
				type: 'boolean',
				default: false,
				description: 'Whether to reproduce vertical lines in the document. Not applicable if mode=native_text.',
			},
			{
				displayName: 'Mark Horizontal Lines',
				name: 'mark_horizontal_lines',
				type: 'boolean',
				default: false,
				description: 'Whether to reproduce horizontal lines. Not applicable if mode=native_text, requires mark_vertical_lines=true.',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: 'default',
				description: 'Auditing feature. Value associated with API invocation for usage reports.',
			},
			{
				displayName: 'File Name',
				name: 'file_name',
				type: 'string',
				default: '',
				description: 'Auditing feature. Value associated with API invocation for usage reports.',
			},
			{
				displayName: 'Add Line Numbers',
				name: 'add_line_nos',
				type: 'boolean',
				default: false,
				description: 'Whether to add line numbers to extracted text and save line metadata for highlights API',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		try {
			const { helpers, logger } = this;

			for (let i = 0; i < items.length; i++) {
				const fileContents = this.getNodeParameter('file_contents', i) as string;

				if (!items[i].binary?.[fileContents]) {
					throw new NodeOperationError(
						this.getNode(),
						`No binary data property "${fileContents}" exists on input`,
					);
				}

				const binaryData = items[i].binary![fileContents];
				const fileBuffer = Buffer.from(binaryData.data, 'base64');

				const host = this.getNodeParameter('host', i) as string;
				const mode = this.getNodeParameter('mode', i) as string;
				const outputMode = this.getNodeParameter('output_mode', i) as string;
				const pageSeparator = this.getNodeParameter('page_seperator', i) as string;
				const pagesToExtract = this.getNodeParameter('pages_to_extract', i) as string;
				const lineSplitterTolerance = this.getNodeParameter('line_splitter_tolerance', i) as number;
				const lineSplitterStrategy = this.getNodeParameter('line_splitter_strategy', i) as string;
				const horizontalStretchFactor = this.getNodeParameter('horizontal_stretch_factor', i) as number;
				const markVerticalLines = this.getNodeParameter('mark_vertical_lines', i) as boolean;
				const markHorizontalLines = this.getNodeParameter('mark_horizontal_lines', i) as boolean;
				const tag = this.getNodeParameter('tag', i) as string;
				const fileName = this.getNodeParameter('file_name', i) as string;
				const addLineNumbers = this.getNodeParameter('add_line_nos', i) as boolean;
				const timeout = this.getNodeParameter('timeout', i) as number;

				const requestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${host}/api/v2/whisper`,
					headers: {
						'Content-Type': 'application/octet-stream',
					},
					body: fileBuffer,
					timeout: 120 * 1000,
					qs: {
						mode,
						output_mode: outputMode,
						page_seperator: pageSeparator,
						pages_to_extract: pagesToExtract,
						line_splitter_tolerance: lineSplitterTolerance,
						line_splitter_strategy: lineSplitterStrategy,
						horizontal_stretch_factor: horizontalStretchFactor,
						mark_vertical_lines: markVerticalLines,
						mark_horizontal_lines: markHorizontalLines,
						tag,
						file_name: fileName,
						add_line_nos: addLineNumbers,
					},
					accept: 'application/json',
				};


				let result: any;
				try {
					result = await helpers.httpRequestWithAuthentication.call(this, 'llmWhispererApi', requestOptions);
				} catch (requestError: any) {
					throw requestError;
				}

				// httpRequestWithAuthentication returns already-parsed JSON if Content-Type is application/json
				const resultContent = typeof result === 'string' ? JSON.parse(result) : result;


				if (!resultContent.whisper_hash) {
					throw new NodeOperationError(
						this.getNode(),
						`Invalid API response: ${resultContent.message || JSON.stringify(resultContent)}`,
					);
				}

				const whisperHash = resultContent.whisper_hash;

				let status = 'processing';
				const t1 = Date.now();
				let resultContentX: any;

				while (status !== 'processed' && status !== 'error') {
					await sleep(2000);

					const statusResult = await helpers.httpRequestWithAuthentication.call(this, 'llmWhispererApi', {
						method: 'GET' as IHttpRequestMethods,
						url: `${host}/api/v2/whisper-status`,
						qs: {
							whisper_hash: whisperHash,
						},
					});

					// httpRequestWithAuthentication returns already-parsed JSON if Content-Type is application/json
					resultContentX = typeof statusResult === 'string' ? JSON.parse(statusResult) : statusResult;
					status = resultContentX.status;

					const currentTime = Date.now();
					const elapsedSeconds = (currentTime - t1) / 1000;

					if (elapsedSeconds > timeout) {
						throw new NodeOperationError(
							this.getNode(),
							`Operation timed out after ${timeout} seconds`,
						);
					}
				}

				if (status === 'error') {
					const errorMessage = resultContentX.message || 'Processing failed';
					const errorDetails = resultContentX.detail ? JSON.stringify(resultContentX.detail) : '';
					throw new NodeOperationError(
						this.getNode(),
						`LLMWhisperer processing error: ${errorMessage}. ${errorDetails}`,
					);
				}

				if (status === 'processed') {
					const retrieveResult = await helpers.httpRequestWithAuthentication.call(this, 'llmWhispererApi', {
						method: 'GET' as IHttpRequestMethods,
						url: `${host}/api/v2/whisper-retrieve`,
						qs: {
							whisper_hash: whisperHash,
						},
					});

					// httpRequestWithAuthentication returns already-parsed JSON if Content-Type is application/json
					const retrieveResultContent = typeof retrieveResult === 'string' ? JSON.parse(retrieveResult) : retrieveResult;

					delete retrieveResultContent.metadata;
					delete retrieveResultContent.webhook_metadata;
					returnData.push({
						json: retrieveResultContent,
						pairedItem: { item: i },
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