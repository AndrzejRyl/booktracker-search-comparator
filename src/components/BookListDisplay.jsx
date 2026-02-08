export default function BookListDisplay({ books, highlightFn, small }) {
  return (
    <div className="space-y-1">
      {books.map((book, i) => {
        const highlighted = highlightFn ? highlightFn(book) : false;
        return (
          <div key={i} className="flex items-baseline gap-2 text-sm">
            <span className={`font-mono w-5 text-right shrink-0 ${highlighted ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {book.rank}{!small && '.'}
            </span>
            <span className={`text-zinc-200${small ? ' text-xs' : ''}`}>{book.title}</span>
            <span className="text-zinc-600">&mdash;</span>
            <span className={`text-zinc-400${small ? ' text-xs' : ''}`}>{book.author}</span>
          </div>
        );
      })}
    </div>
  );
}
