// 共享 Markdown 渲染模块
// - markdown-it 核心渲染（tables / strikethrough / breaks / linkify）
// - markdown-it-texmath + KaTeX 渲染 LaTeX 公式（$...$ 行内、$$...$$ 块级）
// - 自定义 image 规则：视频扩展名或 data:video 渲染为 <video> 可播放
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v|mkv|avi)(?:[?#].*)?$/i;

const md = new MarkdownIt({
  html: true,            // 允许模型输出原生 <video> 等标签
  linkify: true,
  breaks: true,
})
  .use(texmath, {
    engine: katex,
    delimiters: 'dollars', // $...$ / $$...$$
    katexOptions: { throwOnError: false, strict: false },
  });

// 放行 data:video URI（markdown-it 默认只放行 data:image）
const origValidateLink = md.validateLink.bind(md);
md.validateLink = (url) => {
  if (/^data:video\//i.test(url)) return true;
  return origValidateLink(url);
};

// 视频 → <video controls>
const defaultImage = md.renderer.rules.image || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const src = token.attrGet('src') || '';
  const alt = token.content || '';
  if (VIDEO_EXT.test(src) || /^data:video\//i.test(src)) {
    return `<video controls preload="metadata" class="md-video" src="${src}" title="${alt}"></video>`;
  }
  return defaultImage(tokens, idx, options, env, self);
};

export function renderMarkdown(text) {
  return md.render(text || '');
}

// 供外部测试/复用
export { md, katex };