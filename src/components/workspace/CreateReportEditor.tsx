import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bold, Italic, List, ListOrdered, Mic, Redo2, Underline as UnderlineIcon, Undo2 } from 'lucide-react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/overlay';

/**
 * The Create Report findings editor (toolbar, dictation, rich text). Its own module so Tiptap loads
 * with the dialog instead of in the main bundle; CreateReportDialog lazy-loads it.
 */
export default function CreateReportEditor({
  onChange,
  labelledBy,
  describedBy,
  disabled,
}: {
  /** Plain text of the findings, one line per paragraph, trimmed. */
  onChange: (text: string) => void;
  labelledBy: string;
  describedBy: string;
  disabled?: boolean;
}) {
  const changed = useRef(onChange);
  changed.current = onChange;
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false })],
    // The dialog renders client-side only, so the editor exists on the first render and the box never jumps.
    immediatelyRender: true,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-required': 'true',
        'aria-labelledby': labelledBy,
        'aria-describedby': describedBy,
        class: 'min-h-[200px] px-3.5 py-3 text-base leading-relaxed text-ink outline-none',
      },
      // Pasting from WhatsApp or a document keeps the words only.
      handlePaste: (_view, event) => {
        const plain = event.clipboardData?.getData('text/plain');
        if (!plain) return false;
        editorRef.current?.commands.insertContent(plain.split(/\r?\n/).map((line) => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] })));
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => changed.current(ed.getText({ blockSeparator: '\n' }).trim()),
  });
  editorRef.current = editor;

  // Locked while the case is being sent.
  useEffect(() => {
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <>
      <Toolbar editor={editor} disabled={disabled} />
      <div className="relative max-h-[40dvh] min-h-[200px] overflow-y-auto [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:my-0 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5">
        {editor.isEmpty && (
          <p aria-hidden className="pointer-events-none absolute left-3.5 top-3 text-base leading-relaxed text-muted">
            Type, paste or dictate the positive findings…
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const MAC = typeof navigator !== 'undefined' && /Mac|iP/.test(navigator.platform);

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const Ctor = typeof window === 'undefined' ? undefined : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

  useEffect(() => () => recognition.current?.stop(), []);
  useEffect(() => {
    if (disabled) recognition.current?.stop();
  }, [disabled]);

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = 'en-GB';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t: string = e.results[i][0].transcript;
        if (e.results[i].isFinal) editor.chain().focus('end').insertContent(`${t.trim()} `).run();
        else live += t;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast.error('Microphone blocked', { description: 'Allow the microphone for this site in the browser address bar.' });
      else if (e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Dictation stopped', { description: String(e.error) });
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recognition.current = rec;
    rec.start();
    setListening(true);
  };

  // `toggle` buttons announce their pressed state; Undo and Redo are plain actions.
  const btn = (label: string, icon: ReactNode, run: () => void, opts: { toggle?: boolean; active?: boolean; off?: boolean; keys: string }) => (
    <Tooltip content={label} shortcut={`${MAC ? '⌘' : 'Ctrl'} ${opts.keys.replace(/\+/g, ' ')}`}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={opts.toggle ? Boolean(opts.active) : undefined}
        aria-keyshortcuts={`${MAC ? 'Meta' : 'Control'}+${opts.keys}`}
        disabled={disabled || opts.off}
        onClick={run}
        className={cn(opts.active && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent')}
      >
        {icon}
      </Button>
    </Tooltip>
  );
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-2 px-1.5 py-1">
      {btn('Bold', <Bold className="h-4 w-4" />, () => chain().toggleBold().run(), { toggle: true, active: editor.isActive('bold'), keys: 'B' })}
      {btn('Italic', <Italic className="h-4 w-4" />, () => chain().toggleItalic().run(), { toggle: true, active: editor.isActive('italic'), keys: 'I' })}
      {btn('Underline', <UnderlineIcon className="h-4 w-4" />, () => chain().toggleUnderline().run(), { toggle: true, active: editor.isActive('underline'), keys: 'U' })}
      <span className="mx-1 h-4 w-px bg-line" aria-hidden />
      {btn('Bulleted list', <List className="h-4 w-4" />, () => chain().toggleBulletList().run(), { toggle: true, active: editor.isActive('bulletList'), keys: 'Shift+8' })}
      {btn('Numbered list', <ListOrdered className="h-4 w-4" />, () => chain().toggleOrderedList().run(), { toggle: true, active: editor.isActive('orderedList'), keys: 'Shift+7' })}
      <span className="mx-1 h-4 w-px bg-line" aria-hidden />
      {btn('Undo', <Undo2 className="h-4 w-4" />, () => chain().undo().run(), { off: !editor.can().undo(), keys: 'Z' })}
      {btn('Redo', <Redo2 className="h-4 w-4" />, () => chain().redo().run(), { off: !editor.can().redo(), keys: 'Shift+Z' })}
      {/* Dictation is the main phone input path, so on phones it gets its own full-width row. */}
      <div className="ml-auto flex min-w-0 items-center gap-2 max-sm:basis-full max-sm:justify-between max-sm:border-t max-sm:border-line max-sm:pt-1">
        {listening && <span className="min-w-0 flex-1 truncate text-sm italic text-muted sm:max-w-[16rem]">{interim || 'Listening…'}</span>}
        {Ctor ? (
          <Tooltip content={listening ? 'Stop dictation' : 'Dictate (English UK)'}>
            {/* Live work is cobalt, never red: red is for failure only. */}
            <Button
              variant="subtle"
              size="sm"
              aria-label={listening ? 'Stop dictation' : 'Dictate'}
              disabled={disabled}
              onClick={toggleMic}
              className={cn('ml-auto', listening && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent')}
            >
              <Mic className="h-4 w-4" />
              {listening ? 'Stop' : 'Dictate'}
              {listening && (
                <span className="grid h-3 w-3 place-items-center" aria-hidden>
                  <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-soft-pulse" />
                </span>
              )}
            </Button>
          </Tooltip>
        ) : (
          <Tooltip content="Dictation needs Chrome or Edge">
            {/* Focusable, so keyboard users can reach the reason too. */}
            <span tabIndex={0} className="ml-auto rounded-md">
              <Button variant="subtle" size="sm" disabled>
                <Mic className="h-4 w-4" />
                Dictate
              </Button>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
