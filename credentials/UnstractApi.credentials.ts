import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UnstractApi implements ICredentialType {
	name = 'unstractApi';
	displayName = 'Unstract API';
	documentationUrl = 'https://docs.unstract.com/unstract/index.html';
	icon = 'file:llmWhisperer.svg';
	
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The Unstract API Bearer token',
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