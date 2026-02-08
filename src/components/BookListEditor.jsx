import { useState } from 'react';

export default function BookListEditor({ books, onChange, maxBooks = 9 }) {
  const [bookInputMode, setBookInputMode] = useState('manual');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');

  const handleAddBook = () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;
    if (books.length >= maxBooks) return;

    onChange([
      ...books,
      { rank: books.length + 1, title: newBookTitle.trim(), author: newBookAuthor.trim() },
    ]);
    setNewBookTitle('');
    setNewBookAuthor('');
  };

  const handleAddBookKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddBook();
    }
  };

  const handleRemoveBook = (index) => {
    onChange(
      books.filter((_, i) => i !== index).map((b, i) => ({ ...b, rank: i + 1 }))
    );
  };

  const handleSwitchToJson = () => {
    setBookInputMode('json');
    setJsonError(null);
    if (books.length > 0) {
      setJsonInput(JSON.stringify(
        books.map(({ title, author }) => ({ title, author })),
        null,
        2,
      ));
    } else {
      setJsonInput('');
    }
  };

  const handleApplyJson = () => {
    setJsonError(null);
    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setJsonError('Invalid JSON format');
      return;
    }

    if (!Array.isArray(parsed)) {
      setJsonError('Input must be a JSON array');
      return;
    }

    if (parsed.length > maxBooks) {
      setJsonError(`Maximum ${maxBooks} books allowed`);
      return;
    }

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
        setJsonError(`Book at index ${i} is missing a valid "title"`);
        return;
      }
      if (!item.author || typeof item.author !== 'string' || !item.author.trim()) {
        setJsonError(`Book at index ${i} is missing a valid "author"`);
        return;
      }
    }

    const ranked = parsed.map((item, i) => ({
      rank: i + 1,
      title: item.title.trim(),
      author: item.author.trim(),
    }));

    onChange(ranked);
    setBookInputMode('manual');
    setJsonInput('');
    setJsonError(null);
  };

  const renderBooksManual = () => (
    <>
      <div className="space-y-2">
        {books.map((book, i) => (
          <div key={i} className="flex items-center bg-zinc-800/50 rounded-lg px-4 py-2.5 gap-3">
            <span className="text-zinc-500 text-sm font-mono w-6">{book.rank}.</span>
            <span className="text-zinc-100 text-sm font-medium">{book.title}</span>
            <span className="text-zinc-600">&mdash;</span>
            <span className="text-zinc-400 text-sm flex-1">{book.author}</span>
            <button
              onClick={() => handleRemoveBook(i)}
              className="text-zinc-500 hover:text-rose-400 text-sm transition-colors"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      {books.length < maxBooks && (
        <div className="flex gap-3 mt-3">
          <input
            type="text"
            placeholder="Title"
            value={newBookTitle}
            onChange={(e) => setNewBookTitle(e.target.value)}
            onKeyDown={handleAddBookKeyDown}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Author"
            value={newBookAuthor}
            onChange={(e) => setNewBookAuthor(e.target.value)}
            onKeyDown={handleAddBookKeyDown}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddBook}
            disabled={!newBookTitle.trim() || !newBookAuthor.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}
    </>
  );

  const renderBooksJson = () => (
    <>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder='[{"title": "Book Title", "author": "Author Name"}, ...]'
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y min-h-[120px]"
      />
      {jsonError && <p className="text-sm text-rose-400 mt-2">{jsonError}</p>}
      <button
        onClick={handleApplyJson}
        className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg text-sm transition-colors mt-3"
      >
        Apply JSON
      </button>
    </>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-zinc-300">
          Books ({books.length} of {maxBooks})
        </p>
        <div className="flex bg-zinc-800 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setBookInputMode('manual')}
            className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
              bookInputMode === 'manual'
                ? 'text-zinc-100 bg-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Manual
          </button>
          <button
            onClick={handleSwitchToJson}
            className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
              bookInputMode === 'json'
                ? 'text-zinc-100 bg-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            JSON
          </button>
        </div>
      </div>
      {bookInputMode === 'manual' ? renderBooksManual() : renderBooksJson()}
    </div>
  );
}
