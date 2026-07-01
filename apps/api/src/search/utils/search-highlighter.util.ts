/**
 * 搜索高亮工具函数
 *
 * 提供文本高亮功能，用于在搜索结果中标记匹配的关键词
 */

/** 允许的 HTML 标签白名单（安全防护） */
const ALLOWED_HIGHLIGHT_TAGS = new Set([
  'mark',
  'em',
  'strong',
  'b',
  'i',
  'span',
]);

/**
 * 转义正则表达式特殊字符
 *
 * @param str 待转义的字符串
 * @returns 转义后的字符串
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 验证 HTML 标签是否在白名单中
 *
 * @param tag 标签名
 * @returns 是否为允许的标签
 */
function isAllowedTag(tag: string): boolean {
  return ALLOWED_HIGHLIGHT_TAGS.has(tag.toLowerCase());
}

/**
 * 高亮文本中的匹配关键词
 *
 * 在文本中查找所有匹配关键词的位置，并用 HTML 标签包裹
 * 支持不区分大小写的匹配和自定义高亮标签
 *
 * @param text 待高亮的文本
 * @param query 搜索关键词
 * @param tag 高亮标签名（默认 'mark'），必须在白名单中
 * @returns 高亮后的 HTML 字符串，如果标签不合法则返回原文本
 *
 * @example
 * highlightText('Nike Air Max 90', 'nike', 'mark')
 * // 返回: '<mark>Nike</mark> Air Max 90'
 *
 * @example
 * highlightText('Red and Blue', 'red', 'strong')
 * // 返回: '<strong>Red</strong> and Blue'
 */
export function highlightText(
  text: string,
  query: string,
  tag: string = 'mark',
): string {
  if (!text || !query) {
    return text;
  }

  // 安全检查：标签必须在白名单中，不合法时降级为 mark
  if (!isAllowedTag(tag)) {
    console.warn(
      `highlightText: 非法标签 "${tag}" 被拒绝，降级为 mark。允许的标签: ${Array.from(ALLOWED_HIGHLIGHT_TAGS).join(', ')}`,
    );
    tag = 'mark';
  }

  try {
    // 将查询分词，分别高亮每个词
    const words = query.split(/\s+/).filter(Boolean);
    const escapedWords = words.map(escapeRegex);
    const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');

    // 替换匹配的文本为高亮标签包裹的文本
    return text.replace(regex, `<${tag}>$1</${tag}>`);
  } catch (error) {
    console.error(`highlightText 失败: ${error.message}`);
    return text;
  }
}

/**
 * 高亮多个关键词
 *
 * 支持同时高亮多个关键词，每个关键词可以使用不同的标签
 *
 * @param text 待高亮的文本
 * @param keywords 关键词数组
 * @param tag 高亮标签名（默认 'mark'）
 * @returns 高亮后的 HTML 字符串
 *
 * @example
 * highlightMultipleKeywords('Nike Air Max 90', ['nike', 'max'], 'mark')
 * // 返回: '<mark>Nike</mark> Air <mark>Max</mark> 90'
 */
export function highlightMultipleKeywords(
  text: string,
  keywords: string[],
  tag: string = 'mark',
): string {
  if (!text || !keywords || keywords.length === 0) {
    return text;
  }

  // 安全检查
  if (!isAllowedTag(tag)) {
    console.warn(
      `highlightMultipleKeywords: 非法标签 "${tag}" 被拒绝。允许的标签: ${Array.from(ALLOWED_HIGHLIGHT_TAGS).join(', ')}`,
    );
    return text;
  }

  try {
    // 合并所有关键词为一个正则表达式（用 | 分隔）
    const escapedKeywords = keywords.map(escapeRegex).join('|');
    const regex = new RegExp(`(${escapedKeywords})`, 'gi');

    return text.replace(regex, `<${tag}>$1</${tag}>`);
  } catch (error) {
    console.error(`highlightMultipleKeywords 失败: ${error.message}`);
    return text;
  }
}

/**
 * 移除文本中的所有 HTML 标签
 *
 * @param text 包含 HTML 标签的文本
 * @returns 纯文本（移除所有标签）
 */
export function stripHtmlTags(text: string): string {
  if (!text) {
    return text;
  }

  return text.replace(/<[^>]*>/g, '');
}

/**
 * 截取文本片段并高亮关键词（用于搜索摘要）
 *
 * 在文本中查找关键词位置，提取包含关键词的上下文片段
 *
 * @param text 完整文本
 * @param query 搜索关键词
 * @param contextLength 上下文长度（关键词前后各取多少字符）
 * @param tag 高亮标签名
 * @returns 高亮后的文本片段，如果未找到关键词则返回文本开头
 *
 * @example
 * extractHighlightedSnippet(
 *   'This is a very long text about Nike shoes and sports equipment',
 *   'nike',
 *   20,
 *   'mark'
 * )
 * // 返回: '...long text about <mark>Nike</mark> shoes and sports...'
 */
export function extractHighlightedSnippet(
  text: string,
  query: string,
  contextLength: number = 50,
  tag: string = 'mark',
): string {
  if (!text || !query) {
    return (
      text.substring(0, contextLength * 2) +
      (text.length > contextLength * 2 ? '...' : '')
    );
  }

  // 安全检查
  if (!isAllowedTag(tag)) {
    return (
      text.substring(0, contextLength * 2) +
      (text.length > contextLength * 2 ? '...' : '')
    );
  }

  try {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      // 未找到关键词，返回文本开头
      return (
        text.substring(0, contextLength * 2) +
        (text.length > contextLength * 2 ? '...' : '')
      );
    }

    // 计算片段起始和结束位置
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + query.length + contextLength);

    let snippet = text.substring(start, end);

    // 添加省略号
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < text.length) {
      snippet = snippet + '...';
    }

    // 高亮关键词
    return highlightText(snippet, query, tag);
  } catch (error) {
    console.error(`extractHighlightedSnippet 失败: ${error.message}`);
    return (
      text.substring(0, contextLength * 2) +
      (text.length > contextLength * 2 ? '...' : '')
    );
  }
}
