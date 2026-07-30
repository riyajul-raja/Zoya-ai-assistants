import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
  isStreaming?: boolean;
}

const CodeBlock: React.FC<{ language: string; code: string; isStreaming?: boolean }> = ({ language, code, isStreaming }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code || isStreaming) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/15 bg-[#0a0a0e] shadow-lg text-left select-text" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 border-b border-white/10 text-xs text-neutral-400 font-mono select-none">
        <span className="uppercase font-semibold text-emerald-400">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isStreaming}
          className={`flex items-center gap-1.5 text-xs py-0.5 px-1.5 rounded transition-colors ${
            isStreaming
              ? 'text-neutral-600 cursor-not-allowed'
              : 'text-neutral-400 hover:text-white cursor-pointer hover:bg-white/10'
          }`}
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-neutral-200 selection:bg-emerald-500/30">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function preprocessMarkdown(raw: string, isStreaming?: boolean): string {
  if (!raw) return '';
  let text = raw;

  if (!isStreaming) return text;

  // 1. Check for unclosed code block (```)
  const codeBlockMatches = text.match(/```/g);
  const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

  if (codeBlockCount % 2 !== 0) {
    if (!text.endsWith('\n')) {
      text += '\n';
    }
    text += '```';
  } else {
    // 2. Check for unclosed inline code (`)
    const inlineMatches = text.match(/`/g);
    const inlineCount = inlineMatches ? inlineMatches.length : 0;
    if (inlineCount % 2 !== 0) {
      text += '`';
    }

    // 3. Check for unclosed bold (**)
    const boldMatches = text.match(/\*\*/g);
    const boldCount = boldMatches ? boldMatches.length : 0;
    if (boldCount % 2 !== 0) {
      text += '**';
    }

    // 4. Check for unclosed italic (*)
    const asteriskMatches = text.match(/(?<!\*)\*(?!\*)/g);
    if (asteriskMatches) {
      const nonListAsterisks = text.split('\n').map(line => {
        if (line.trim().startsWith('* ')) return '';
        return line;
      }).join('\n').match(/(?<!\*)\*(?!\*)/g);
      if (nonListAsterisks && nonListAsterisks.length % 2 !== 0) {
        text += '*';
      }
    }
  }

  // 5. Progressive Table Header Auto-completion during streaming
  if (text.includes('|')) {
    const lines = text.split('\n');
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      processedLines.push(line);

      const trimmed = line.trim();
      if (trimmed.startsWith('|') && (trimmed.endsWith('|') || trimmed.split('|').length >= 3)) {
        const isHeader = i === 0 || !lines[i - 1].trim().startsWith('|');
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        const isDivider = nextLine.startsWith('|') && nextLine.includes('---');

        if (isHeader && !isDivider) {
          const colCount = line.split('|').length - 2;
          if (colCount > 0) {
            const divider = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
            processedLines.push(divider);
          }
        }
      }
    }
    text = processedLines.join('\n');
  }

  return text;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser, isStreaming }) => {
  const [displayedText, setDisplayedText] = useState(content);
  const targetTextRef = useRef(content);
  targetTextRef.current = content;

  // Smooth line-by-line / progressive token animation hook
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(content);
      return;
    }

    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const target = targetTextRef.current;
        if (prev === target) return prev;
        if (prev.length >= target.length) return target;

        const remaining = target.slice(prev.length);
        const newlineIndex = remaining.indexOf('\n');

        if (newlineIndex !== -1) {
          // Advance line-by-line for smooth natural rhythm
          return target.slice(0, prev.length + newlineIndex + 1);
        } else {
          // Step through partial lines in small natural chunks (4-10 chars)
          const stepSize = Math.min(remaining.length, Math.max(4, Math.floor(remaining.length / 2)));
          return target.slice(0, prev.length + stepSize);
        }
      });
    }, 45); // 45ms natural line-by-line cadence

    return () => clearInterval(interval);
  }, [isStreaming, content]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(content);
    }
  }, [isStreaming, content]);

  const textToRender = isStreaming ? displayedText : content;
  const processedContent = preprocessMarkdown(textToRender, isStreaming);

  if (!content && isStreaming) {
    return (
      <div className="flex items-center gap-1.5 py-1 text-emerald-400 min-h-[24px]">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]" />
      </div>
    );
  }

  return (
    <div className={`markdown-body text-[15px] leading-relaxed break-words select-text relative ${isUser ? 'text-white' : 'text-neutral-100'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks and inline code
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && (match || codeString.includes('\n') || className?.includes('language-'))) {
              return (
                <CodeBlock language={match ? match[1] : ''} code={codeString} isStreaming={isStreaming} />
              );
            }
            return (
              <code
                className="bg-white/10 text-amber-300 border border-white/10 rounded px-1.5 py-0.5 text-[0.875em] font-mono select-text"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Headings
          h1({ children }) {
            return <h1 className="text-xl font-bold mt-4 mb-2 text-white border-b border-white/10 pb-1.5 flex items-center gap-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mt-3.5 mb-1.5 text-white flex items-center gap-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mt-3 mb-1 text-white/95 flex items-center gap-2">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-sm font-semibold mt-2.5 mb-1 text-white/90">{children}</h4>;
          },
          // Paragraphs
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed text-neutral-200">{children}</p>;
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside my-2 space-y-1 pl-1 text-neutral-200 marker:text-emerald-400">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside my-2 space-y-1 pl-1 text-neutral-200 marker:text-emerald-400 font-medium">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed my-0.5">{children}</li>;
          },
          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-emerald-500/70 bg-emerald-500/10 pl-3.5 py-2 my-2.5 rounded-r-lg text-neutral-300 italic">
                {children}
              </blockquote>
            );
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-xl border border-white/15 shadow-sm">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-white/10 font-semibold text-white">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-white/10 bg-white/5">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-white/10 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-300">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3.5 py-2 text-neutral-200">{children}</td>;
          },
          // Strong & Emphasis
          strong({ children }) {
            return <strong className="font-bold text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-neutral-300">{children}</em>;
          },
          // Horizontal Line
          hr() {
            return <hr className="my-4 border-white/15" />;
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 font-medium transition-colors"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1.5 bg-emerald-400 rounded-sm animate-pulse align-middle shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
      )}
    </div>
  );
};

export default MarkdownRenderer;
