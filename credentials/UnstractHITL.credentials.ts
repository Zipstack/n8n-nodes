import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UnstractHITL implements ICredentialType {
	name = 'unstractHITL';
	displayName = 'Unstract HITL';
	documentationUrl = 'https://docs.unstract.com/unstract/index.html';
	icon = 'file:llmWhisperer.svg';
	
	properties: INodeProperties[] = [
		{
			displayName: 'HITL Key',
			name: 'HITLKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The Bearer token for Unstract HITL API',
		},
		{
			displayName: 'Organization ID',
			name: 'orgId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Unstract Organization ID',
		},
	];
}