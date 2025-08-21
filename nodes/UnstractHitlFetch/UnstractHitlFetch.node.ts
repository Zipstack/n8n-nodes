import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class UnstractHitlFetch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Unstract HITL Fetch',
		name: 'unstractHitlFetch',
		icon: 'file:unstractHitlFetch.svg',
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
				name: 'unstractHITLApi',
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
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('unstractHITLApi');
		const hitlKey = credentials.HITLKey as string;
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
			} catch (error: any) {
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