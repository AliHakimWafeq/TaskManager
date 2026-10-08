import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";

export type SlashState = {
  query: string;
  range: Range;
  rect: DOMRect | null;
};

/**
 * Connects the ProseMirror suggestion plugin (outside React) with the React menu.
 * A plain class so React's compiler rules don't treat it as a ref.
 */
export class SlashBridge {
  private listener: (state: SlashState | null) => void = () => {};
  private keyHandler: (event: KeyboardEvent) => boolean = () => false;

  subscribe(fn: (state: SlashState | null) => void) {
    this.listener = fn;
    return () => {
      this.listener = () => {};
    };
  }
  emit(state: SlashState | null) {
    this.listener(state);
  }
  /** Register the menu's key handler; return true from it when the key was consumed. */
  setKeyHandler(fn: (event: KeyboardEvent) => boolean) {
    this.keyHandler = fn;
    return () => {
      this.keyHandler = () => false;
    };
  }
  keyDown(event: KeyboardEvent) {
    return this.keyHandler(event);
  }

  private submitHandler: (() => void) | null = null;
  setSubmitHandler(fn: (() => void) | null) {
    this.submitHandler = fn;
    return () => {
      this.submitHandler = null;
    };
  }
  /** Returns true when a submit handler ran (⌘/Ctrl+Enter). */
  submit() {
    if (!this.submitHandler) return false;
    this.submitHandler();
    return true;
  }

  private imagePicker: () => void = () => {};
  setImagePicker(fn: () => void) {
    this.imagePicker = fn;
    return () => {
      this.imagePicker = () => {};
    };
  }
  pickImage() {
    this.imagePicker();
  }
}

export const slashPluginKey = new PluginKey("slash-command");

/**
 * Notion-style "/" menu. Rendering is delegated to React through `handlers`;
 * this extension only tracks the trigger, query and caret position.
 */
export function createSlashCommand(bridge: SlashBridge) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      const editor = this.editor as Editor;
      return [
        Suggestion({
          editor,
          pluginKey: slashPluginKey,
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          allowedPrefixes: [" ", " "],
          // Never open inside code.
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            return !$from.parent.type.spec.code;
          },
          items: () => [],
          render: () => {
            const emit = (p: SuggestionProps) =>
              bridge.emit({ query: p.query, range: p.range, rect: p.clientRect?.() ?? null });
            return {
              onStart: emit,
              onUpdate: emit,
              onExit: () => bridge.emit(null),
              onKeyDown: ({ event }) => {
                if (event.key === "Escape") {
                  bridge.emit(null);
                  return true;
                }
                return bridge.keyDown(event);
              },
            };
          },
        }),
      ];
    },
  });
}
