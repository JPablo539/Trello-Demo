import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import List from './List';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface ListItem {
  id: string;
  created_at: string;
  list_name: string;
  position: number;
  board_id: string;
}

interface Card {
  id: string;
  created_at: string;
  position: number;
  list_id: string;
  content: string;
}

const Board: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [boardName, setBoardName] = useState('');
  const [lists, setLists] = useState<ListItem[]>([]);
  const [cards, setCards] = useState<{ [key: string]: Card[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [newCardContent, setNewCardContent] = useState<{ [key: string]: string }>({});
  const [isDragging, setIsDragging] = useState(false);

  const fetchListsAndCards = useCallback(async () => {
    try {
      setLoading(true);
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (listsError) throw listsError;
      setLists(listsData || []);

      if (listsData && listsData.length > 0) {
        const { data: cardsData, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .in('list_id', listsData.map(list => list.id))
          .order('position');

        if (cardsError) throw cardsError;

        const groupedCards: { [key: string]: Card[] } = {};
        listsData.forEach(list => {
          groupedCards[list.id] = (cardsData || []).filter(card => card.list_id === list.id);
        });
        setCards(groupedCards);
      } else {
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load board data');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;

    const listsSubscription = supabase
      .channel('lists-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` }, async () => {
        const { data: listsData } = await supabase.from('lists').select('*').eq('board_id', boardId).order('position');
        if (listsData) setLists(listsData);
      })
      .subscribe();

    const cardsSubscription = supabase
      .channel('cards-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, async () => {
        const { data: listsData } = await supabase.from('lists').select('id').eq('board_id', boardId);
        if (listsData) {
          const listIds = listsData.map(list => list.id);
          const { data: cardsData } = await supabase.from('cards').select('*').in('list_id', listIds).order('position');
          if (cardsData) {
            const groupedCards: { [key: string]: Card[] } = {};
            listIds.forEach(listId => {
              groupedCards[listId] = cardsData.filter(card => card.list_id === listId);
            });
            setCards(groupedCards);
          }
        }
      })
      .subscribe();

    return () => {
      listsSubscription.unsubscribe();
      cardsSubscription.unsubscribe();
    };
  }, [boardId]);

  useEffect(() => {
    const fetchBoardName = async () => {
      if (!boardId) return;
      try {
        const { data } = await supabase.from('boards').select('board_name').eq('id', boardId).single();
        if (data) setBoardName(data.board_name);
      } catch (err) {
        console.error('Error fetching board name:', err);
        setError('Failed to load board name');
      }
    };
    fetchBoardName();
  }, [boardId]);

  useEffect(() => {
    if (boardId) fetchListsAndCards();
  }, [boardId, fetchListsAndCards]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const newPosition = lists.length > 0 ? Math.max(...lists.map(l => l.position)) + 1 : 1;
      const { data, error } = await supabase
        .from('lists')
        .insert([{ board_id: boardId, list_name: newListName.trim(), position: newPosition }])
        .select()
        .maybeSingle();

      if (error) throw error;
      setNewListName('');
    } catch (err) {
      console.error('Error creating list:', err);
      setError('Failed to create list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const { error } = await supabase.from('lists').delete().eq('id', listId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting list:', err);
      setError('Failed to delete list');
    }
  };

  const handleUpdateList = async (listId: string, title: string) => {
    try {
      const { error } = await supabase.from('lists').update({ list_name: title }).eq('id', listId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating list name:', err);
      setError('Failed to update list name');
    }
  };

  const handleAddCard = async (listId: string, content: string) => {
    try {
      const newPosition = cards[listId]?.length > 0 ? Math.max(...cards[listId].map(c => c.position)) + 1 : 1;
      const { error } = await supabase.from('cards').insert([{ list_id: listId, content, position: newPosition }]);
      if (error) throw error;
    } catch (err) {
      console.error('Error creating card:', err);
      setError('Failed to create card');
    }
  };

  const handleDeleteCard = async (cardId: string, listId: string) => {
    try {
      const { error } = await supabase.from('cards').delete().eq('id', cardId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting card:', err);
      setError('Failed to delete card');
    }
  };

  const handleUpdateCard = async (cardId: string, content: string) => {
    try {
      const { error } = await supabase.from('cards').update({ content }).eq('id', cardId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating card:', err);
      setError('Failed to update card');
    }
  };

  const onDragStart = () => {
    setIsDragging(true);
  };

  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    const { destination, source, draggableId, type } = result;
    
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    try {
      if (type === 'LIST') {
        const newLists = Array.from(lists);
        const [movedList] = newLists.splice(source.index, 1);
        newLists.splice(destination.index, 0, movedList);
        
        // Update positions in the database
        const updates = newLists.map((list, index) => 
          supabase.from('lists').update({ position: index + 1 }).eq('id', list.id)
        );
        
        await Promise.all(updates);
        setLists(newLists);
      } else if (type === 'CARD') {
        const sourceList = cards[source.droppableId] || [];
        const destList = cards[destination.droppableId] || [];
        const [movedCard] = sourceList.splice(source.index, 1);
        
        if (source.droppableId === destination.droppableId) {
          destList.splice(destination.index, 0, movedCard);
          const updates = destList.map((card, index) =>
            supabase.from('cards').update({ position: index + 1 }).eq('id', card.id)
          );
          await Promise.all(updates);
          setCards({ ...cards, [source.droppableId]: destList });
        } else {
          movedCard.list_id = destination.droppableId;
          destList.splice(destination.index, 0, movedCard);
          
          const sourceUpdates = sourceList.map((card, index) =>
            supabase.from('cards').update({ position: index + 1 }).eq('id', card.id)
          );
          
          const destUpdates = destList.map((card, index) =>
            supabase.from('cards').update({ position: index + 1, list_id: destination.droppableId }).eq('id', card.id)
          );
          
          await Promise.all([...sourceUpdates, ...destUpdates]);
          setCards({
            ...cards,
            [source.droppableId]: sourceList,
            [destination.droppableId]: destList
          });
        }
      }
    } catch (err) {
      console.error('Error updating positions:', err);
      setError('Failed to update positions');
      // Refresh the data to ensure consistency
      fetchListsAndCards();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1D2125]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#579DFF]/30 border-t-[#579DFF]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1D2125]">
        <div className="bg-red-500/10 text-red-500 px-6 py-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-blue-600 p-4 md:p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/boards')}
              className="flex items-center px-3 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Boards
            </button>
            <h1 className="text-2xl font-bold text-white">{boardName}</h1>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Add new list..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateList();
              }}
              className="w-48 md:w-64 px-3 py-2 bg-white/10 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent placeholder-white/70 text-white"
            />
            <button
              onClick={handleCreateList}
              className="ml-2 px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Add List
            </button>
          </div>
        </div>

        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="LIST" direction="horizontal">
            {(provided) => (
              <div
                className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-bottom min-h-0 flex p-4 gap-4"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {lists.map((list, index) => (
                  <Draggable 
                    key={list.id} 
                    draggableId={list.id} 
                    index={index}
                    isDragDisabled={isDragging}
                  >
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps} 
                        {...provided.dragHandleProps}
                      >
                        <List
                          id={list.id}
                          title={list.list_name}
                          cards={cards[list.id] || []}
                          index={index}
                          onDeleteList={handleDeleteList}
                          onUpdateList={handleUpdateList}
                          onDeleteCard={handleDeleteCard}
                          onUpdateCard={handleUpdateCard}
                          onAddCard={handleAddCard}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

export default Board; 