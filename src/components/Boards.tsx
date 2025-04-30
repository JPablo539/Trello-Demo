import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Board {
  id: string;
  board_name: string;
  created_at: string;
}

const Boards: React.FC = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [newBoardName, setNewBoardName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

    const fetchBoards = async () => {
      try {
      setLoading(true);
        const profileId = localStorage.getItem('profileId');
        if (!profileId) {
        throw new Error('No profile ID found');
        }

      const { data: relations, error: relationsError } = await supabase
        .from('boardProfileRelation')
        .select('board_id')
        .eq('profile_id', profileId);

      if (relationsError) throw relationsError;

      if (relations && relations.length > 0) {
        const boardIds = relations.map(relation => relation.board_id);
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('*')
          .in('id', boardIds)
          .order('created_at', { ascending: false });

        if (boardsError) throw boardsError;
        setBoards(boardsData || []);
      }
      } catch (err) {
      console.error('Error fetching boards:', err);
        setError('Failed to load boards');
      } finally {
        setLoading(false);
      }
    };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;

    try {
      const profileId = localStorage.getItem('profileId');
      if (!profileId) {
        throw new Error('No profile ID found');
      }

      // Create new board
      const { data: newBoard, error: boardError } = await supabase
        .from('boards')
        .insert([{
          board_name: newBoardName.trim(),
          profiles_id: profileId,
          created_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      if (boardError) throw boardError;

      // Create board-profile relation
      const { error: relationError } = await supabase
        .from('boardProfileRelation')
        .insert([{
          board_id: newBoard.id,
          profile_id: profileId,
          created_at: new Date().toISOString()
        }]);

      if (relationError) throw relationError;

      setBoards([newBoard, ...boards]);
      setNewBoardName('');
    } catch (err) {
      console.error('Error creating board:', err);
      setError('Failed to create board');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      // First delete all cards associated with lists in this board
      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .select('id')
        .eq('board_id', boardId);

      if (listsError) throw listsError;

      if (lists && lists.length > 0) {
        const listIds = lists.map(list => list.id);
        const { error: cardsError } = await supabase
          .from('cards')
          .delete()
          .in('list_id', listIds);

        if (cardsError) throw cardsError;

        // Then delete all lists in this board
        const { error: deleteListsError } = await supabase
          .from('lists')
          .delete()
          .eq('board_id', boardId);

        if (deleteListsError) throw deleteListsError;
      }

      // Delete board-profile relations
      const { error: relationsError } = await supabase
        .from('boardProfileRelation')
        .delete()
        .eq('board_id', boardId);

      if (relationsError) throw relationsError;

      // Finally delete the board itself
      const { error: boardError } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (boardError) throw boardError;

      setBoards(boards.filter(board => board.id !== boardId));
    } catch (err) {
      console.error('Error deleting board:', err);
      setError('Failed to delete board. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('profileId');
    navigate('/');
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
    <div className="min-h-screen bg-[#1D2125] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">My Boards</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
            <input
              type="text"
              placeholder="Create new board..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBoard();
              }}
              className="w-64 px-3 py-2 bg-white/10 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent placeholder-white/70 text-white"
            />
              <button
                onClick={handleCreateBoard}
              className="px-4 py-2 bg-[#579DFF] text-white rounded-md hover:bg-[#579DFF]/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#579DFF]/50"
              >
              Create Board
              </button>
          </div>
            </div>
            
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {boards.map((board) => (
                  <div
                    key={board.id}
              className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors duration-200 cursor-pointer group"
              onClick={() => navigate(`/board/${board.id}`)}
            >
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-medium text-white">{board.board_name}</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBoard(board.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-white transition-opacity duration-200"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/50 border-t-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-sm text-white/50 mt-2">
                Created {new Date(board.created_at).toLocaleDateString()}
              </p>
          </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Boards; 
