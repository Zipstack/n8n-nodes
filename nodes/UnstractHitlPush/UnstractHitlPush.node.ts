import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
	sleep,
} from 'n8n-workflow';

export class UnstractHitlPush implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Unstract HITL Push',
		name: 'unstractHitlPush',
		icon: 'file:unstractHitlPush.svg',
		group: ['transform'],
		version: 1,
		usableAsTool: true,
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
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['document'],
					},
				},
				options: [
					{
						name: 'Push to HITL',
						value: 'push',
						description: 'Push document for Human-in-the-Loop processing',
						action: 'Push document to HITL queue',
					},
				],
				default: 'push',
			},
			{
				displayName: 'File Contents',
				name: 'file_contents',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['push'],
					},
				},
				default: 'data',
				description: 'Name of the binary property containing file data',
				required: true,
			},
			{
				displayName: 'Unstract Host',
				name: 'host',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['push'],
					},
				},
				default: 'https://us-central.unstract.com',
				required: true,
			},
			{
				displayName: 'API Deployment Name',
				name: 'deployment_name',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['push'],
					},
				},
				default: '',
				required: true,
			},
			{
				displayName: 'HITL Queue Name',
				name: 'hitl_queue_name',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['push'],
					},
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['push'],
					},
				},
				default: 600,
				description: 'Max seconds to wait for processing',
				required: true,
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['push'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Include Metadata',
						name: 'include_metadata',
						type: 'boolean',
						default: true,
						description: 'Whether to include document metadata in the response',
					},
					{
						displayName: 'Include Metrics',
						name: 'include_metrics',
						type: 'boolean',
						default: true,
						description: 'Whether to include processing metrics in the response',
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
						description: 'Whether to use cached results if available',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		try {
			const credentials = await this.getCredentials('unstractApi');
			const orgId = credentials.orgId as string;
			const { helpers } = this;

			for (let i = 0; i < items.length; i++) {
				try {
					const binaryPropertyName = this.getNodeParameter('file_contents', i) as string;

				if (!items[i].binary?.[binaryPropertyName]) {
					throw new NodeOperationError(this.getNode(), `No binary data property "${binaryPropertyName}" exists on input`);
				}

				const binaryData = items[i].binary![binaryPropertyName];
				const fileBuffer = Buffer.from(binaryData.data, 'base64');

				const timeout = this.getNodeParameter('timeout', i) as number;
				const deploymentName = this.getNodeParameter('deployment_name', i) as string;
				const host = this.getNodeParameter('host', i) as string;
				const hitlQueueName = this.getNodeParameter('hitl_queue_name', i) as string;

				// Get additional options with defaults
				const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;
				const includeMetrics = additionalOptions.include_metrics !== undefined ? additionalOptions.include_metrics : true;
				const includeMetadata = additionalOptions.include_metadata !== undefined ? additionalOptions.include_metadata : true;
				const tags = additionalOptions.tags || '';
				const useFileHistory = additionalOptions.use_file_history !== undefined ? additionalOptions.use_file_history : false;

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
							timeout: 5 * 60 * 1000,
							returnFullResponse: true,
							ignoreHttpStatusErrors: true,
						};

						const statusResult = await helpers.httpRequestWithAuthentication.call(this, 'unstractApi', statusRequestOptions);
						const statusCode = statusResult.statusCode || 200;
						const body = statusResult.body || statusResult;
						resultContent = typeof body === 'string' ? JSON.parse(body) : body;
						executionStatus = resultContent.status;

						// HTTP 422 indicates execution still in progress - continue polling
						if (statusCode === 422) {
							continue;
						}

						// Handle other error status codes
						if (statusCode >= 400 && statusCode !== 422) {
							throw new NodeOperationError(
								this.getNode(),
								`Failed to check execution status: HTTP ${statusCode}`,
							);
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
				} catch (error: any) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message || 'Unknown error occurred',
							},
							pairedItem: { item: i },
						});
						continue;
					}

					if (error.message) {
						throw new NodeOperationError(this.getNode(), error.message);
					}
					throw error;
				}
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
