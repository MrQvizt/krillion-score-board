/** Hand-written database types matching supabase/migrations. */

export type Profile = {
  id: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
};

export type Board = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  created_by: string | null;
  created_at: string;
};

export type BoardMember = {
  board_id: string;
  user_id: string;
  added_at: string;
};

export type Score = {
  id: string;
  user_id: string;
  played_on: string;
  score: number;
  note: string;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        { id: string; display_name: string; is_admin?: boolean; created_at?: string },
        Partial<Profile>
      >;
      boards: Table<
        Board,
        {
          id?: string;
          name: string;
          description?: string;
          emoji?: string;
          created_by?: string | null;
          created_at?: string;
        },
        Partial<Board>
      >;
      board_members: Table<
        BoardMember,
        { board_id: string; user_id: string; added_at?: string },
        Partial<BoardMember>
      >;
      scores: Table<
        Score,
        {
          id?: string;
          user_id: string;
          played_on: string;
          score: number;
          note?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Score>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_board_member: { Args: { target_board: string }; Returns: boolean };
      shares_board_with: { Args: { target_user: string }; Returns: boolean };
      admin_list_users: { Args: Record<string, never>; Returns: AdminUser[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
