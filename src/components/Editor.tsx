import React, { useEffect, useRef, useCallback } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, Decoration, DecorationSet, ViewUpdate, ViewPlugin, WidgetType } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { debounce } from 'lodash';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

// --- Live Preview Logic ---

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number, readonly onToggle: (pos: number) => void) {
    super();
  }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-checkbox-container inline-flex items-center mr-1 cursor-pointer";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.checked;
    input.className = "w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer";
    input.onclick = (e) => {
      e.preventDefault();
      this.onToggle(this.pos);
    };
    wrap.appendChild(input);
    return wrap;
  }
  ignoreEvent() { return false; }
}

const livePreviewPlugin = (onToggleCheckbox: (pos: number) => void) => ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.getDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.decorations = this.getDecorations(update.view);
    }
  }

  getDecorations(view: EditorView) {
    const widgets: any[] = [];
    const selection = view.state.selection.main;

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      
      // Task lists: - [ ] or - [x]
      const taskRegex = /^- \[( |x)\] /gm;
      let match;
      while ((match = taskRegex.exec(text)) !== null) {
        const pos = from + match.index;
        const line = view.state.doc.lineAt(pos);
        const isCursorOnLine = selection.from >= line.from && selection.to <= line.to;

        if (!isCursorOnLine) {
          const isChecked = match[1] === 'x';
          widgets.push(Decoration.replace({
            widget: new CheckboxWidget(isChecked, pos, onToggleCheckbox),
          }).range(pos, pos + 6));
          
          if (isChecked) {
            widgets.push(Decoration.mark({
              class: "line-through text-gray-400 opacity-60"
            }).range(pos + 6, line.to));
          }
        }
      }

      // Headers
      const headerRegex = /^(#{1,6}) /gm;
      while ((match = headerRegex.exec(text)) !== null) {
        const pos = from + match.index;
        const line = view.state.doc.lineAt(pos);
        const isCursorOnLine = selection.from >= line.from && selection.to <= line.to;
        const level = match[1].length;

        if (!isCursorOnLine) {
          widgets.push(Decoration.replace({}).range(pos, pos + level + 1));
        }
        
        const headerClass = level === 1 ? 'text-[30px] font-bold leading-tight' :
                           level === 2 ? 'text-[24px] font-bold leading-tight' :
                           level === 3 ? 'text-[20px] font-bold leading-tight' : 'font-bold';
        
        widgets.push(Decoration.mark({ class: headerClass }).range(line.from, line.to));
      }

      // Bold: **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      while ((match = boldRegex.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;
        const isCursorInRange = selection.from >= start && selection.to <= end;

        if (!isCursorInRange) {
          widgets.push(Decoration.replace({}).range(start, start + 2));
          widgets.push(Decoration.replace({}).range(end - 2, end));
        }
        widgets.push(Decoration.mark({ class: "font-bold" }).range(start, end));
      }

      // Italic: *text*
      const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
      while ((match = italicRegex.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;
        const isCursorInRange = selection.from >= start && selection.to <= end;

        if (!isCursorInRange) {
          widgets.push(Decoration.replace({}).range(start, start + 1));
          widgets.push(Decoration.replace({}).range(end - 1, end));
        }
        widgets.push(Decoration.mark({ class: "italic" }).range(start, end));
      }

      // Inline code: `code`
      const inlineCodeRegex = /`([^`]+)`/g;
      while ((match = inlineCodeRegex.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;
        const isCursorInRange = selection.from >= start && selection.to <= end;

        if (!isCursorInRange) {
          widgets.push(Decoration.replace({}).range(start, start + 1));
          widgets.push(Decoration.replace({}).range(end - 1, end));
        }
        widgets.push(Decoration.mark({ class: "bg-[#f7f6f3] text-[#eb5757] px-1 rounded font-mono text-[0.9em]" }).range(start, end));
      }

      // Blockquotes: > text
      const quoteRegex = /^> /gm;
      while ((match = quoteRegex.exec(text)) !== null) {
        const pos = from + match.index;
        const line = view.state.doc.lineAt(pos);
        const isCursorOnLine = selection.from >= line.from && selection.to <= line.to;

        if (!isCursorOnLine) {
          widgets.push(Decoration.replace({}).range(pos, pos + 2));
        }
        widgets.push(Decoration.mark({ class: "border-l-4 border-gray-200 pl-4 italic text-gray-500 block my-2" }).range(line.from, line.to));
      }
    }

    return Decoration.set(widgets.sort((a, b) => a.from - b.from));
  }
}, {
  decorations: v => v.decorations
});

// --- Editor Component ---

export const Editor: React.FC<EditorProps> = ({ content, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const debouncedOnChange = useCallback(
    debounce((val: string) => {
      onChange(val);
    }, 500),
    [onChange]
  );

  const handleToggleCheckbox = useCallback((pos: number) => {
    if (!viewRef.current) return;
    const view = viewRef.current;
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    const match = /^- \[( |x)\] /.exec(lineText);
    if (match) {
      const newChar = match[1] === 'x' ? ' ' : 'x';
      const newText = lineText.replace(/^- \[( |x)\] /, `- [${newChar}] `);
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText }
      });
    }
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        livePreviewPlugin(handleToggleCheckbox),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%", outline: "none" },
          ".cm-content": { 
            fontFamily: "inherit", 
            fontSize: "16px", 
            color: "#37352f",
            padding: "0",
            caretColor: "#37352f"
          },
          ".cm-activeLine": { backgroundColor: "transparent" },
          ".cm-gutters": { display: "none" },
          "&.cm-focused": { outline: "none" },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            debouncedOnChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update editor content when active file changes
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: content }
      });
    }
  }, [content]);

  return (
    <div className="w-full h-full flex justify-center overflow-y-auto bg-white">
      <div className="w-full max-w-[720px] py-8 px-12 min-h-full">
        <div ref={editorRef} className="h-full" />
      </div>
    </div>
  );
};
