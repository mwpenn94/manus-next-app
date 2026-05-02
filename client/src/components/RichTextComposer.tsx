import DOMPurify from "dompurify";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Code, Link, Smile, AtSign, Eye, EyeOff } from 'lucide-react';

// Mock data for @mentions
const users = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
  { id: '4', name: 'David' },
];

// Mock data for emojis
const emojis = ['😀', '😂', '😍', '🤔', '👍', '🎉', '❤️', '🚀'];

const RichTextComposer = () => {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setContent(html);

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const text = range.startContainer.textContent?.substring(0, range.startOffset) || '';
        const lastAt = text.lastIndexOf('@');
        if (lastAt !== -1) {
          const query = text.substring(lastAt + 1);
          setMentionQuery(query);
          setShowMentions(true);
        } else {
          setShowMentions(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = DOMPurify.sanitize(content);
    }
  }, [content]);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
      applyFormat('createLink', url);
    }
  };

  const handleMentionSelect = (name: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        const text = textNode.textContent || '';
        const lastAt = text.lastIndexOf('@');

        if (lastAt !== -1) {
            range.setStart(textNode, lastAt);
            range.setEnd(textNode, range.startOffset);
            range.deleteContents();

            const mentionNode = document.createElement('span');
            mentionNode.className = 'text-blue-500 font-semibold';
            mentionNode.textContent = `@${name}`;
            const spaceNode = document.createTextNode('\u00A0'); // Non-breaking space

            range.insertNode(spaceNode);
            range.insertNode(mentionNode);
            
            range.setStartAfter(spaceNode);
            range.collapse(true);

            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    setShowMentions(false);
    handleInput();
  };

  const handleEmojiSelect = (emoji: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    setShowEmojis(false);
    handleInput();
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  const characterCount = editorRef.current?.innerText.length || 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button onClick={() => applyFormat('bold')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><Bold className="h-4 w-4" /></button>
          <button onClick={() => applyFormat('italic')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><Italic className="h-4 w-4" /></button>
          <button onClick={() => applyFormat('insertHTML', '<code>&nbsp;</code>')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><Code className="h-4 w-4" /></button>
          <button onClick={handleLink} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><Link className="h-4 w-4" /></button>
          <div className="relative">
            <button onClick={() => setShowEmojis(!showEmojis)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><Smile className="h-4 w-4" /></button>
            {showEmojis && (
              <div className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-2">
                {emojis.map(emoji => (
                  <button key={emoji} onClick={() => handleEmojiSelect(emoji)} className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded">{emoji}</button>
                ))}
              </div>
            )}
          </div>
           <div className="relative">
            <AtSign className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
             {showMentions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onMouseDown={() => handleMentionSelect(user.name)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    {user.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setIsPreview(!isPreview)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center space-x-1 text-sm">
          {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{isPreview ? 'Edit' : 'Preview'}</span>
        </button>
      </div>

      {isPreview ? (
        <div
          className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[150px]"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="p-4 min-h-[150px] focus:outline-none dark:text-gray-200"
          suppressContentEditableWarning={true}
        />
      )}

      <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-right text-sm text-gray-500 dark:text-gray-400">
        {characterCount} characters
      </div>
    </div>
  );
};

export default RichTextComposer;
