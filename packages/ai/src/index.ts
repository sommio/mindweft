export { streamChat } from './stream-chat';
export { generateText, generateEmbedding } from './stream-chat';
export { classifyAiError, AiError } from './errors';
export { validateProviderConfig } from './provider-config';

export type { AiErrorCategory } from './errors';
export type {
  ProviderConfig,
  ProviderConfigErrorCode,
  ProviderConfigError,
  ProviderConfigValidation,
} from './provider-config';
export type {
  ChatMessage,
  StreamChatResult,
  StreamChatInput,
  GenerateTextInput,
  EmbeddingInput,
} from './stream-chat';
