'use client';

import { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@/components/icons/PencilIcon';

interface EditableTitleProps {
  title: string;
  onTitleChange: (title: string) => void;
  placeholder?: string;
}

export function EditableTitle({ title, onTitleChange, placeholder = 'Untitled' }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onTitleChange(trimmed);
    } else {
      setEditValue(title || placeholder);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  const displayTitle = title || placeholder;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none px-2 py-1"
          style={{ width: `${Math.max(editValue.length, 10)}ch` }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 group">
      <h1 className="text-2xl font-bold text-gray-900">
        {displayTitle}
      </h1>
      <button
        onClick={() => {
          setEditValue(title || placeholder);
          setIsEditing(true);
        }}
        className="p-1.5 text-gray-400 hover:text-gray-600 opacity-100 transition-opacity"
        title="Edit title"
      >
        <PencilIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

