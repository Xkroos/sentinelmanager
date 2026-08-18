import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Plus, Edit, Trash2, StickyNote, X } from 'lucide-react';
import { Note } from '../lib/supabase';

export function NotesModule() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useUI();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadNotes();
  }, [user]);

  const loadNotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !noteText.trim()) return;

    setLoading(true);
    try {
      if (editingNote) {
        await supabase.from('notes').update({ note_text: noteText, updated_at: new Date().toISOString() }).eq('id', editingNote.id);
      } else {
        await supabase.from('notes').insert([{ user_id: user.id, note_text: noteText }]);
      }
      setNoteText('');
      setEditingNote(null);
      setShowForm(false);
      await loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Error al guardar la nota', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setNoteText(note.note_text);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('¿Estás seguro de eliminar esta nota?'))) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) loadNotes();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingNote(null);
    setNoteText('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <StickyNote className="text-amber-500" /> NOTAS RÁPIDAS
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-2 font-bold shadow-sm active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nueva Nota</span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-amber-500" />
                  {editingNote ? 'Editando Nota' : 'Redactar Nota'}
              </h3>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-5 h-5" />
              </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 dark:text-white outline-none min-h-[120px] transition-all"
              placeholder="Escribe tus observaciones aquí..."
              required
            />
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={loading || !noteText.trim()}
                className="px-8 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm active:scale-95"
              >
                {loading ? 'Guardando...' : editingNote ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <StickyNote size={64} className="text-amber-500" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-slate-800 dark:text-amber-50 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                {note.note_text}
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-amber-200/50 dark:border-amber-500/10 relative z-10">
              <p className="text-[10px] font-bold text-amber-700/50 dark:text-amber-500/50 uppercase tracking-widest">
                {new Date(note.created_at).toLocaleDateString('es-VE', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(note)} className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(note.id)} className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {notes.length === 0 && !showForm && (
          <div className="col-span-full text-center py-16 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No hay notas guardadas</p>
          </div>
        )}
      </div>
    </div>
  );
}
