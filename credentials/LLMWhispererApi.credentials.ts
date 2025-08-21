import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LLMWhispererApi implements ICredentialType {
	name = 'llmWhispererApi';
	displayName = 'LLMWhisperer API';
	documentationUrl = 'https://docs.unstract.com/llmwhisperer/';
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
			description: 'The API key for LLMWhisperer service',
		},
	];
}