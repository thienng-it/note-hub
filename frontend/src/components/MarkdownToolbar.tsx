interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number) => void;
  disabled?: boolean;
}

export function MarkdownToolbar({ onInsert, disabled = false }: MarkdownToolbarProps) {
  const tools = [
    {
      icon: 'fa-bold',
      title: 'Bold',
      action: () => onInsert('**text**', -2),
      shortcut: 'Ctrl+B',
    },
    {
      icon: 'fa-italic',
      title: 'Italic',
      action: () => onInsert('*text*', -1),
      shortcut: 'Ctrl+I',
    },
    {
      icon: 'fa-strikethrough',
      title: 'Strikethrough',
      action: () => onInsert('~~text~~', -2),
    },
    {
      icon: 'fa-heading',
      title: 'Heading',
      action: () => onInsert('## Heading\n\n', 0),
    },
    {
      icon: 'fa-list-ul',
      title: 'Bullet List',
      action: () => onInsert('- Item 1\n- Item 2\n- Item 3\n\n', 0),
    },
    {
      icon: 'fa-list-ol',
      title: 'Numbered List',
      action: () => onInsert('1. Item 1\n2. Item 2\n3. Item 3\n\n', 0),
    },
    {
      icon: 'fa-check-square',
      title: 'Task List',
      action: () => onInsert('- [ ] Task 1\n- [ ] Task 2\n- [x] Task 3\n\n', 0),
    },
    {
      icon: 'fa-link',
      title: 'Link',
      action: () => onInsert('[Link Text](https://example.com)', -24),
      shortcut: 'Ctrl+K',
    },
    {
      icon: 'fa-image',
      title: 'Image',
      action: () => onInsert('![Alt Text](https://example.com/image.png)', -35),
    },
    {
      icon: 'fa-code',
      title: 'Inline Code',
      action: () => onInsert('`code`', -1),
    },
    {
      icon: 'fa-file-code',
      title: 'Code Block',
      action: () => onInsert('```\ncode\n```\n\n', -6),
    },
    {
      icon: 'fa-quote-right',
      title: 'Quote',
      action: () => onInsert('> Quote text\n\n', 0),
    },
    {
      icon: 'fa-table',
      title: 'Table',
      action: () =>
        onInsert(
          '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n\n',
          0,
        ),
    },
    {
      icon: 'fa-minus',
      title: 'Horizontal Rule',
      action: () => onInsert('\n---\n\n', 0),
    },
  ];

  return (
    <div className="glass-card-item flex flex-wrap gap-1 p-2 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] mb-2">
      {tools.map((tool, index) => (
        <button
          key={index}
          type="button"
          onClick={tool.action}
          disabled={disabled}
          className="p-2 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={`${tool.title}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        >
          <i className={`glass-i fas ${tool.icon} text-sm`}></i>
        </button>
      ))}

      {/* Help link */}
      <div className="ml-auto flex items-center">
        <a
          href="https://www.markdownguide.org/basic-syntax/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--text-muted)] hover:text-blue-600 transition-colors px-2 py-1 flex items-center gap-1"
        >
          <i className="fas fa-question-circle"></i>
          <span className="hidden sm:inline">Markdown Guide</span>
        </a>
      </div>
    </div>
  );
}
