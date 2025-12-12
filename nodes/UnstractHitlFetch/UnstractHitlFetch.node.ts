import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class UnstractHitlFetch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Unstract HITL Fetch',
		name: 'unstractHitlFetch',
		icon: 'file:unstractHitlFetch.svg',
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		description: 'Fetches approved documents from Unstract Human-in-the-Loop (HITL) queue after manual review',
		defaults: {
			name: 'Unstract HITL Fetch',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'unstractHITLApi',
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
						name: 'Fetch Approved',
						value: 'fetchApproved',
						description: 'Fetch approved documents from HITL queue',
						action: 'Fetch approved document from HITL',
					},
				],
				default: 'fetchApproved',
			},
			{
				displayName: 'Unstract Host',
				name: 'host',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['fetchApproved'],
					},
				},
				default: 'http://localhost:8000',
				required: true,
			},
			{
				displayName: 'Workflow ID',
				name: 'workflow_id',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['fetchApproved'],
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
						operation: ['fetchApproved'],
					},
				},
				default: '',
				required: true,
				description: 'HITL queue name to filter results',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('unstractHITLApi');
		const orgId = credentials.orgId as string;
		const helpers = this.helpers;

		for (let i = 0; i < items.length; i++) {
			const host = this.getNodeParameter('host', i) as string;
			const workflowId = this.getNodeParameter('workflow_id', i) as string;
			const hitlQueueName = this.getNodeParameter('hitl_queue_name', i) as string;

			let url = `${host}/mr/api/${orgId}/approved/result/${workflowId}/`;
			if (hitlQueueName && hitlQueueName.trim() !== '') {
				url += `?hitl_queue_name=${encodeURIComponent(hitlQueueName)}`;
			}

			const options = {
				method: 'GET' as IHttpRequestMethods,
				url,
				ignoreHttpStatusErrors: true,
			};

			try {
				const response = await helpers.httpRequestWithAuthentication.call(this, 'unstractHITLApi', options);
				const parsed = typeof response === 'string' ? JSON.parse(response) : response;

				if (parsed.error) {
					returnData.push({
						json: { error: parsed.error, hasData: false },
						pairedItem: { item: i }
					});
				} else if (parsed.data) {
					returnData.push({
						json: { ...parsed.data, hasData: true },
						pairedItem: { item: i }
					});
				} else {
					throw new NodeOperationError(this.getNode(), 'Unexpected response format.');
				}
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
