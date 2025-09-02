import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
	IAuthenticateGeneric,
} from 'n8n-workflow';

export class LLMWhispererApi implements ICredentialType {
	name = 'llmWhispererApi';
	displayName = 'LLMWhisperer API';
	documentationUrl = 'https://docs.unstract.com/llmwhisperer/';
	icon = 'file:llmWhisperer.svg' as const;
	
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
			description: 'The API key for LLMWhisperer service',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://httpbin.org',
			url: '/status/200',
			method: 'GET',
		},
		skipAuth: true,
	};
}