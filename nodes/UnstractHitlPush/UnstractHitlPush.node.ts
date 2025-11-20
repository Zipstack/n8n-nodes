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

export class UnstractHitlPush implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Unstract HITL Push',
		name: 'unstractHitlPush',
		icon: 'file:unstractHitlPush.svg',
		group: ['transform'],
		version: 1,
		description: 'Push document for HITL processing using Unstract API',
		defaults: {
			name: 'Unstract HITL Push',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'unstractApi',
				required: true,
			},
		],
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
				displayName: 'Use Cached Results',
				name: 'use_file_history',
				type: 'boolean',
				default: false,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		try {
			const credentials = await this.getCredentials('unstractApi');
			const apiKey = credentials.apiKey as string;
			const orgId = credentials.orgId as string;
			const { helpers, logger } = this;

			for (let i = 0; i < items.length; i++) {
				const binaryPropertyName = this.getNodeParameter('file_contents', i) as string;

				if (!items[i].binary?.[binaryPropertyName]) {
					throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" exists on input`);
				}

				const binaryData = items[i].binary![binaryPropertyName];
				const fileBuffer = Buffer.from(binaryData.data, 'base64');

				const timeout = this.getNodeParameter('timeout', i) as number;
				const deploymentName = this.getNodeParameter('deployment_name', i) as string;
				const host = this.getNodeParameter('host', i) as string;
				const includeMetrics = this.getNodeParameter('include_metrics', i) as boolean;
				const includeMetadata = this.getNodeParameter('include_metadata', i) as boolean;
				const tags = this.getNodeParameter('tags', i) as string;
				const useFileHistory = this.getNodeParameter('use_file_history', i) as boolean;
				const hitlQueueName = this.getNodeParameter('hitl_queue_name', i) as string;

				// Manual multipart/form-data construction (cloud-compatible, no external dependencies)
				// Workaround for n8n issue #18271 where httpRequestWithAuthentication doesn't properly
				// handle formData objects. See: https://github.com/n8n-io/n8n/issues/18271
				const boundary = `----n8nFormBoundary${Date.now()}`;
				const CRLF = '\r\n';

				// Build multipart body parts
				const parts: Buffer[] = [];

				// File field
				parts.push(Buffer.from(
					`--${boundary}${CRLF}` +
					`Content-Disposition: form-data; name="files"; filename="${binaryData.fileName}"${CRLF}` +
					`Content-Type: ${binaryData.mimeType}${CRLF}${CRLF}`
				));
				parts.push(fileBuffer);
				parts.push(Buffer.from(CRLF));

				// Other fields
				const fields = {
					timeout: '1',
					include_metrics: includeMetrics.toString(),
					include_metadata: includeMetadata.toString(),
					use_file_history: useFileHistory.toString(),
					hitl_queue_name: hitlQueueName,
					...(tags && { tags }),
				};

				for (const [name, value] of Object.entries(fields)) {
					if (value) {
						parts.push(Buffer.from(
							`--${boundary}${CRLF}` +
							`Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
							`${value}${CRLF}`
						));
					}
				}

				// Closing boundary
				parts.push(Buffer.from(`--${boundary}--${CRLF}`));

				// Combine all parts
				const body = Buffer.concat(parts);

				const requestOptions: any = {
					method: 'POST' as IHttpRequestMethods,
					url: `${host}/deployment/api/${orgId}/${deploymentName}/`,
					headers: {
						'Authorization': `Bearer ${apiKey}`,
						'Content-Type': `multipart/form-data; boundary=${boundary}`,
						'Content-Length': body.length.toString(),
					},
					body,
					timeout: 5 * 60 * 1000,
				};


				const result = await helpers.httpRequestWithAuthentication.call(this, 'unstractApi', requestOptions);
				// httpRequestWithAuthentication returns already-parsed JSON if Content-Type is application/json
				const resultData = typeof result === 'string' ? JSON.parse(result) : result;


				if (!resultData || !resultData.message) {
					throw new NodeOperationError(
						this.getNode(),
						`Unexpected API response structure: ${JSON.stringify(resultData)}`,
					);
				}

				let resultContent = resultData.message;
				let executionStatus = resultContent.execution_status;

				if (executionStatus === 'PENDING' || executionStatus === 'EXECUTING') {
					const t1 = new Date();
					const statusApi = resultContent.status_api;

					while (executionStatus !== 'COMPLETED') {
						await sleep(2000);

						const statusRequestOptions: any = {
							method: 'GET' as IHttpRequestMethods,
							url: `${host}${statusApi}`,
							headers: {
								'Authorization': `Bearer ${apiKey}`,
							},
							timeout: 5 * 60 * 1000,
						};

						try {
							const statusResult = await helpers.httpRequest(statusRequestOptions);
							resultContent = typeof statusResult === 'string' ? JSON.parse(statusResult) : statusResult;
							executionStatus = resultContent.status;
						} catch (error: any) {
							// HTTP 422 indicates execution still in progress - this is expected
							if (error.response?.status === 422 && error.response?.data) {
								resultContent = typeof error.response.data === 'string' ? JSON.parse(error.response.data) : error.response.data;
								executionStatus = resultContent.status;
							} else {
								// Actual error - log and rethrow
								if (error.response?.status) {
								}
								throw new NodeOperationError(
									this.getNode(),
									`Failed to check execution status: ${error.message}`,
								);
							}
						}

						const t2 = new Date();
						if ((t2.getTime() - t1.getTime()) / 1000 > timeout) {
							throw new NodeOperationError(this.getNode(), `Timeout reached: ${timeout} seconds`);
						}

						if (executionStatus === 'ERROR') {
							throw new NodeOperationError(this.getNode(), `Error: ${resultContent.message[0]?.error}`);
						}

						if (executionStatus === 'COMPLETED') {
							resultContent = resultContent.message;
						}
					}
				}

				returnData.push({
					json: resultContent,
					pairedItem: { item: i }
				});
			}

			return [returnData];
		} catch (error: any) {
			if (error.message) {
				throw new NodeOperationError(this.getNode(), error.message);
			}
			throw error;
		}
	}
}