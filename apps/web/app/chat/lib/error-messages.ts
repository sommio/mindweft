export function safeErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'provider_unconfigured':
      return '未配置 Provider，请先去设置页连接。';
    case 'provider_invalid':
      return 'Provider 配置无效，请检查 Base URL、API Key 与 Model。';
    case 'provider_rejected':
      return 'Provider 拒绝了请求，请检查 API Key 是否正确。';
    case 'network_unreachable':
      return '无法连接 Provider，请检查 Base URL 或网络。';
    case 'stream_aborted':
      return '已停止生成。';
    case 'invalid_body_shape':
    case 'messages_missing':
    case 'message_invalid':
    case 'messages_empty':
      return '消息内容无效，无法发送。';
    case 'server_failed':
    default:
      return '服务端出错，请稍后重试。';
  }
}
