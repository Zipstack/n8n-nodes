import {
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
} from 'n8n-workflow';

export class UnstractHITLApi implements ICredentialType {
	name = 'unstractHITLApi';
	displayName = 'Unstract HITL API';
	documentationUrl = 'https://docs.unstract.com/unstract/index.html';
	icon = 'file:llmWhisperer.svg' as const;

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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.HITLKey}}',
			},
		},
	};
}