import React, { useState, useRef, useEffect } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

interface Card {
  id: string;
  content: string;
}

interface ListProps {
  id: string;
  title: string;
  cards: Card[];
  index: number;
  onDeleteList: (listId: string) => void;
  onUpdateList: (listId: string, newTitle: string) => void;
  onDeleteCard: (cardId: string, listId: string) => void;
  onUpdateCard: (cardId: string, content: string) => void;
  onAddCard: (listId: string, content: string) => void;
  onCardMove: (
    sourceListId: string,
    sourceIndex: number,
    cardId: string,
    destinationListId: string,
    destinationIndex: number
  ) => void;
}

const List: React.FC<ListProps> = ({
  id,
  title,
  cards,
  index,
  onDeleteList,
  onUpdateList,
  onDeleteCard,
  onUpdateCard,
  onAddCard,
  onCardMove,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [newCardContent, setNewCardContent] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardContent, setEditingCardContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLTextAreaElement>(null);
  const editCardInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
    if (isAddingCard && cardInputRef.current) {
      cardInputRef.current.focus();
    }
    if (editingCardId && editCardInputRef.current) {
      editCardInputRef.current.focus();
      editCardInputRef.current.select();
    }
  }, [isEditingTitle, isAddingCard, editingCardId]);

  useEffect(() => {
    setNewTitle(title);
  }, [title]);

  const handleTitleSubmit = async () => {
    if (newTitle.trim() !== title) {
      setIsLoading(true);
      try {
        await onUpdateList(id, newTitle.trim());
      } finally {
        setIsLoading(false);
      }
    }
    setIsEditingTitle(false);
  };

  const handleCardSubmit = async () => {
    if (newCardContent.trim()) {
      setIsLoading(true);
      try {
        await onAddCard(id, newCardContent.trim());
        setNewCardContent('');
      } finally {
        setIsLoading(false);
      }
    }
    setIsAddingCard(false);
  };

  const handleCardEdit = async (cardId: string) => {
    if (editingCardContent.trim() && editingCardContent !== cards.find(c => c.id === cardId)?.content) {
      setIsLoading(true);
      try {
        await onUpdateCard(cardId, editingCardContent.trim());
      } finally {
        setIsLoading(false);
      }
    }
    setEditingCardId(null);
    setEditingCardContent('');
  };

  const startCardEdit = (card: Card) => {
    setEditingCardId(card.id);
    setEditingCardContent(card.content);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    submitFn: () => void,
    cancelFn?: () => void
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitFn();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (cancelFn) {
        cancelFn();
      } else {
        setIsEditingTitle(false);
        setIsAddingCard(false);
        setEditingCardId(null);
        setNewCardContent('');
        setNewTitle(title);
        setEditingCardContent('');
      }
    }
  };

  // Register card draggables and drop targets (including list body as a drop target to append at end)
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // Register drop target for the list container to allow dropping anywhere in empty space
    if (listContainerRef.current) {
      cleanups.push(
        dropTargetForElements({
          element: listContainerRef.current,
          getData: () => ({ type: 'CARD_DROP_TARGET', listId: id, index: cards.length }),
          onDrop: ({ source }) => {
            const data = source.data as any;
            if (data?.type === 'CARD') {
              onCardMove(data.sourceListId, data.sourceIndex, data.cardId, id, cards.length);
            }
          },
        })
      );
    }

    // Register drop target for the list body to allow dropping at end
    if (listBodyRef.current) {
      cleanups.push(
        dropTargetForElements({
          element: listBodyRef.current,
          getData: () => ({ type: 'CARD_DROP_TARGET', listId: id, index: cards.length }),
          onDrop: ({ source }) => {
            const data = source.data as any;
            if (data?.type === 'CARD') {
              onCardMove(data.sourceListId, data.sourceIndex, data.cardId, id, cards.length);
            }
          },
        })
      );
    }

    // Register each card as draggable and as a drop target (to drop before it)
    cards.forEach((card, cardIndex) => {
      const element = document.getElementById(`card-${card.id}`) as HTMLElement | null;
      if (!element) return;

      cleanups.push(
        combine(
          draggable({
            element,
            getInitialData: () => ({ type: 'CARD', cardId: card.id, sourceListId: id, sourceIndex: cardIndex }),
          }),
          dropTargetForElements({
            element,
            getData: () => ({ type: 'CARD_DROP_TARGET', listId: id, index: cardIndex }),
            onDrop: ({ source }) => {
              const data = source.data as any;
              if (data?.type === 'CARD') {
                onCardMove(data.sourceListId, data.sourceIndex, data.cardId, id, cardIndex);
              }
            },
          })
        )
      );
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [cards, id, onCardMove]);

  return (
    <div ref={listContainerRef} className="w-72 flex-shrink-0" data-list-id={id} data-list-index={index}>
      <div className="bg-[#ebecf0] rounded-lg shadow-md max-h-[calc(100vh-180px)] flex flex-col">
        <div className="p-3 rounded-t-lg flex justify-between items-center group sticky top-0 bg-[#ebecf0] z-10">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => handleKeyDown(e, handleTitleSubmit)}
              className="w-full px-2 py-1 text-sm font-medium bg-white rounded border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isLoading}
            />
          ) : (
            <h3
              onDoubleClick={() => !isLoading && setIsEditingTitle(true)}
              className="text-sm font-medium text-gray-800 cursor-pointer"
            >
              {title}
            </h3>
          )}
          <button
            onClick={() => !isLoading && onDeleteList(id)}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-700 transition-opacity duration-200"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div
          ref={listBodyRef}
          className={`px-1 py-0.5 overflow-y-auto flex-1 ${cards.length === 0 ? 'min-h-[80px]' : 'min-h-[2px]'}`}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              id={`card-${card.id}`}
              className={`bg-white p-2 mb-2 rounded-lg shadow-sm hover:bg-gray-50 group`}
            >
              {editingCardId === card.id ? (
                <div>
                  <textarea
                    ref={editCardInputRef}
                    value={editingCardContent}
                    onChange={(e) => setEditingCardContent(e.target.value)}
                    onBlur={() => handleCardEdit(card.id)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleCardEdit(card.id))}
                    className="w-full px-2 py-1.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[60px] resize-none"
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 text-sm text-gray-700 cursor-pointer"
                    onDoubleClick={() => !isLoading && startCardEdit(card)}
                  >
                    {card.content}
                  </div>
                  <button
                    onClick={() => !isLoading && onDeleteCard(card.id, id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity duration-200 ml-2"
                    disabled={isLoading}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-2 sticky bottom-0 bg-[#ebecf0]">
          {isAddingCard ? (
            <div>
              <textarea
                ref={cardInputRef}
                value={newCardContent}
                onChange={(e) => setNewCardContent(e.target.value)}
                onBlur={handleCardSubmit}
                onKeyDown={(e) => handleKeyDown(e, handleCardSubmit)}
                placeholder="Enter a title for this card..."
                className="w-full px-2 py-1.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <div className="flex items-center mt-2">
                <button
                  onClick={handleCardSubmit}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                  disabled={isLoading}
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardContent('');
                  }}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => !isLoading && setIsAddingCard(true)}
              className="w-full px-2 py-1.5 bg-transparent text-gray-600 rounded hover:bg-gray-200 transition-colors duration-200 text-sm font-medium text-left disabled:opacity-50"
              disabled={isLoading}
            >
              + Add a card
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default List; 