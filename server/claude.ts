import type { VerifiedSource } from '../src/types/news.ts';

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';

interface AnthropicContentBlock {
  type: string;
  text?: string;
  citations?: Array<{
    type?: string;
    url?: string;
    title?: string;
  }>;
  content?: Array<{
    type?: string;
    url?: string;
    title?: string;
  }>;
}

interface AnthropicMessagesResponse {
  id?: string;
  content?: AnthropicContentBlock[];
  error?: {
    type?: string;
    message?: string;
  };
}

export interface ClaudeCallResult {
  text: string;
  sources: VerifiedSource[];
}

export function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_ANTHROPIC_API_KEY') {
    throw new Error(
      'ANTHROPIC_API_KEY가 설정되어 있지 않습니다. AI Studio의 Settings > Secrets 패널(또는 호스팅 환경변수)에 Claude API Key(ANTHROPIC_API_KEY)를 등록해 주세요.'
    );
  }
  return apiKey;
}

export async function callClaudeMessages(options: {
  prompt: string;
  useWebSearch?: boolean;
  maxUses?: number;
  maxTokens?: number;
  system?: string;
}): Promise<ClaudeCallResult> {
  const apiKey = getAnthropicApiKey();
  const {
    prompt,
    useWebSearch = false,
    maxUses = 5,
    maxTokens = 4096,
    system,
  } = options;

  const payload: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  if (system) {
    payload.system = system;
  }

  if (useWebSearch) {
    payload.tools = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: maxUses,
      },
    ];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await res.text();
    let data: AnthropicMessagesResponse = {};
    try {
      data = JSON.parse(rawBody) as AnthropicMessagesResponse;
    } catch {
      // Non-JSON upstream body
    }

    if (!res.ok) {
      const errType = data.error?.type || `HTTP_${res.status}`;
      const errMsg = data.error?.message || rawBody || `Anthropic API 오류 (${res.status})`;
      throw new Error(`${res.status} ${errType}: ${errMsg}`);
    }

    const blocks = Array.isArray(data.content) ? data.content : [];
    const textParts: string[] = [];
    const sources: VerifiedSource[] = [];
    const seenUris = new Set<string>();

    const addSource = (uri?: string, title?: string) => {
      if (!uri || !uri.startsWith('http') || seenUris.has(uri)) return;
      seenUris.add(uri);
      sources.push({
        title: title?.trim() || '웹 검색 출처',
        uri,
      });
    };

    for (const block of blocks) {
      if (block.type === 'text' && typeof block.text === 'string') {
        textParts.push(block.text);
        if (Array.isArray(block.citations)) {
          for (const cite of block.citations) {
            addSource(cite.url, cite.title);
          }
        }
      } else if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const item of block.content) {
          addSource(item.url, item.title);
        }
      }
    }

    return {
      text: textParts.join('\n').trim(),
      sources,
    };
  } finally {
    clearTimeout(timeout);
  }
}
